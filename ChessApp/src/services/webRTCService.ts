/**
 * WebRTC P2P Service
 * Handles peer-to-peer connections for Presidential Mode
 */

import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';
import InCallManager from 'react-native-incall-manager';

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'ready';
  data?: any;
}

export interface P2PCallbacks {
  onMessage: (message: string) => void;
  onConnectionStateChange: (state: string) => void;
  onError: (error: Error) => void;
}

class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: any | null = null;
  private localStream: MediaStream | null = null;
  private callbacks: P2PCallbacks | null = null;
  private isInitiator = false;
  private localIceCandidates: any[] = [];
  private onLocalIce?: (cands: any[]) => void;
  
  // STUN servers for NAT traversal
  private readonly configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      // For Presidential Mode, could add TURN servers
      // with authentication for guaranteed connectivity
    ],
    // Security settings
    bundlePolicy: 'max-bundle' as const,
    rtcpMuxPolicy: 'require' as const,
    iceCandidatePoolSize: 10,
  };

  /**
   * Initialize P2P connection
   */
  async initialize(isInitiator: boolean, callbacks: P2PCallbacks): Promise<void> {
    this.isInitiator = isInitiator;
    this.callbacks = callbacks;

    try {
      console.log('Initializing WebRTC P2P connection...');
      
      // Create peer connection
      this.peerConnection = new RTCPeerConnection(this.configuration);
      
      // Set up event handlers
      this.setupPeerConnectionHandlers();
      
      // Create data channel for game moves and chat
      if (isInitiator) {
        this.createDataChannel();
      }
      
      console.log('WebRTC initialized');
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
      throw error;
    }
  }

  /**
   * Set up peer connection event handlers
   */
  private setupPeerConnectionHandlers(): void {
    if (!this.peerConnection) return;

    // ICE candidate handler
    (this.peerConnection as any).onicecandidate = (event: any) => {
      if (event.candidate) {
        const cand = event.candidate.toJSON();
        this.localIceCandidates.push(cand);
        this.onLocalIce?.(this.localIceCandidates.slice());
        // Send ICE candidate to remote peer via signaling
        this.sendSignalingMessage({
          type: 'ice-candidate',
          data: cand,
        });
      } else {
        // Gathering complete
        this.onLocalIce?.(this.localIceCandidates.slice());
      }
    };

    // Connection state handler
    (this.peerConnection as any).onconnectionstatechange = () => {
      const state = (this.peerConnection as any)?.connectionState || 'unknown';
      console.log('Connection state:', state);
      
      this.callbacks?.onConnectionStateChange(state);
      
      if (state === 'failed' || state === 'disconnected') {
        this.callbacks?.onError(new Error(`Connection ${state}`));
      }
    };

    // Data channel handler (for receiver)
    (this.peerConnection as any).ondatachannel = (event: any) => {
      console.log('Data channel received');
      this.dataChannel = event.channel;
      this.setupDataChannelHandlers();
    };
  }

  /**
   * Create data channel
   */
  private createDataChannel(): void {
    if (!this.peerConnection) return;

    this.dataChannel = this.peerConnection.createDataChannel('chess-game', {
      ordered: true,
      maxRetransmits: 10,
    });

    this.setupDataChannelHandlers();
  }

  /**
   * Set up data channel handlers
   */
  private setupDataChannelHandlers(): void {
    if (!this.dataChannel) return;

    (this.dataChannel as any).onopen = () => {
      console.log('Data channel opened');
      this.sendMessage(JSON.stringify({ type: 'ready' }));
    };

    (this.dataChannel as any).onclose = () => {
      console.log('Data channel closed');
    };

    (this.dataChannel as any).onmessage = (event: any) => {
      try {
        const message = event.data;
        this.callbacks?.onMessage(message);
      } catch (error) {
        console.error('Failed to handle message:', error);
      }
    };

    (this.dataChannel as any).onerror = (error: any) => {
      console.error('Data channel error:', error);
      const err = error instanceof Error ? error : new Error('Data channel error');
      this.callbacks?.onError(err);
    };
  }

  /**
   * Create offer (for initiator)
   */
  async createOffer(): Promise<RTCSessionDescription> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false,
      });

      await this.peerConnection.setLocalDescription(offer);
      
      return offer;
    } catch (error) {
      console.error('Failed to create offer:', error);
      throw error;
    }
  }

  /**
   * Create answer (for receiver)
   */
  async createAnswer(offer: RTCSessionDescription): Promise<RTCSessionDescription> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      await this.peerConnection.setRemoteDescription(offer);
      
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      return answer;
    } catch (error) {
      console.error('Failed to create answer:', error);
      throw error;
    }
  }

  /**
   * Set remote description
   */
  async setRemoteDescription(description: RTCSessionDescription): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      await this.peerConnection.setRemoteDescription(description);
    } catch (error) {
      console.error('Failed to set remote description:', error);
      throw error;
    }
  }

  /**
   * Add ICE candidate
   */
  async addIceCandidate(candidate: RTCIceCandidate): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    try {
      await this.peerConnection.addIceCandidate(candidate);
    } catch (error) {
      console.error('Failed to add ICE candidate:', error);
      throw error;
    }
  }

  /**
   * Send message through data channel
   */
  sendMessage(message: string): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      console.warn('Data channel not ready');
      return;
    }

    try {
      this.dataChannel.send(message);
    } catch (error) {
      console.error('Failed to send message:', error);
      this.callbacks?.onError(error as Error);
    }
  }

  /**
   * Send signaling message (needs external implementation)
   */
  private sendSignalingMessage(message: SignalingMessage): void {
    // This needs to be implemented by the parent component
    // Can use QR codes, NFC, or manual code exchange
    console.log('Signaling message to send:', message);
  }

  /**
   * Manual signaling helpers for offline code exchange
   */
  async createOfferPackage(): Promise<{ offer: any; iceCandidates: any[] }> {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');
    const offer = await this.createOffer();
    // Wait briefly to gather candidates
    await new Promise(r => setTimeout(r, 1000));
    return { offer: this.peerConnection.localDescription?.toJSON?.() || offer, iceCandidates: this.localIceCandidates.slice() };
  }

  async acceptOfferPackage(pkg: { offer: any; iceCandidates?: any[] }): Promise<{ answer: any; iceCandidates: any[] }> {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');
    await this.setRemoteDescription(new RTCSessionDescription(pkg.offer));
    if (pkg.iceCandidates && pkg.iceCandidates.length) {
      for (const c of pkg.iceCandidates) {
        await this.addIceCandidate(new RTCIceCandidate(c));
      }
    }
    const answer = await this.createAnswer(new RTCSessionDescription(pkg.offer));
    // Wait to gather our ICE
    await new Promise(r => setTimeout(r, 1000));
    return { answer: this.peerConnection.localDescription?.toJSON?.() || answer, iceCandidates: this.localIceCandidates.slice() };
  }

  async applyAnswerPackage(pkg: { answer: any; iceCandidates?: any[] }): Promise<void> {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');
    await this.setRemoteDescription(new RTCSessionDescription(pkg.answer));
    if (pkg.iceCandidates && pkg.iceCandidates.length) {
      for (const c of pkg.iceCandidates) {
        await this.addIceCandidate(new RTCIceCandidate(c));
      }
    }
  }

  onLocalIceCandidates(cb: (cands: any[]) => void) {
    this.onLocalIce = cb;
  }

  getLocalIceCandidates(): any[] { return this.localIceCandidates.slice(); }

  /**
   * Get connection stats
   */
  async getStats(): Promise<any> {
    if (!this.peerConnection) return null;

    try {
      const stats = await this.peerConnection.getStats();
      const statsArray: any[] = [];
      
      (stats as any).forEach((stat: any) => {
        statsArray.push(stat);
      });
      
      return statsArray;
    } catch (error) {
      console.error('Failed to get stats:', error);
      return null;
    }
  }

  /**
   * Check if connection is active
   */
  isConnected(): boolean {
    return this.peerConnection?.connectionState === 'connected' &&
           this.dataChannel?.readyState === 'open';
  }

  /**
   * Clean up connection
   */
  async close(): Promise<void> {
    console.log('Closing WebRTC connection...');

    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Stop in-call manager
    InCallManager.stop();

    this.callbacks = null;
  }
}

export const webRTCService = new WebRTCService();