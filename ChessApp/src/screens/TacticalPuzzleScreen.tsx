import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ChessBoard from '../components/ChessBoard';
import { Chess } from 'chess.js';
import * as Haptics from 'expo-haptics';

interface TacticalPuzzleScreenProps {
  navigation: any;
  route: {
    params: {
      puzzle: any;
      agent: string;
    };
  };
}

const COACH_PERSONALITIES = {
  tactical: {
    name: 'Tactical Assassin',
    emoji: '🎯',
    style: 'aggressive',
    hints: [
      "Look for forcing moves - checks, captures, threats!",
      "Calculate all forcing variations",
      "Don't stop until you see a clear advantage",
    ],
    praise: [
      "Brilliant tactical shot! 🎯",
      "You found the killer blow!",
      "That's what I call a tactical nuke!",
    ],
    criticism: [
      "You missed a forcing move. Always check for tactics first!",
      "Think more aggressively! What can you attack?",
      "Calculate deeper - the winning move is there!",
    ],
  },
  positional: {
    name: 'Positional Master',
    emoji: '🏛️',
    style: 'strategic',
    hints: [
      "Improve your worst placed piece",
      "Control key squares and outposts",
      "Think about pawn structure and long-term plans",
    ],
    praise: [
      "Excellent positional understanding! 🏛️",
      "You're thinking like a grandmaster!",
      "Beautiful strategic play!",
    ],
    criticism: [
      "Think about piece placement, not just tactics",
      "What's your long-term plan here?",
      "Consider the pawn structure implications",
    ],
  },
  endgame: {
    name: 'Endgame Virtuoso',
    emoji: '👑',
    style: 'technical',
    hints: [
      "King activity is crucial in the endgame",
      "Create passed pawns and push them",
      "Calculate precisely - every tempo matters",
    ],
    praise: [
      "Perfect endgame technique! 👑",
      "You understand the fundamentals!",
      "Precise calculation!",
    ],
    criticism: [
      "Activate your king first!",
      "Count the tempos - precision matters here",
      "Remember the basic endgame principles",
    ],
  },
};

const TacticalPuzzleScreen: React.FC<TacticalPuzzleScreenProps> = ({ navigation, route }) => {
  const { puzzle, agent } = route.params;
  const [chess] = useState(new Chess());
  const [boardPosition, setBoardPosition] = useState('');
  const [moveIndex, setMoveIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [solved, setSolved] = useState(false);
  const [coachMessage, setCoachMessage] = useState('');
  const fadeAnim = useState(new Animated.Value(0))[0];
  
  const coach = COACH_PERSONALITIES[agent] || COACH_PERSONALITIES.tactical;

  useEffect(() => {
    // Initialize puzzle
    if (puzzle?.fen) {
      chess.load(puzzle.fen);
      setBoardPosition(chess.fen());
      showCoachIntro();
    } else {
      // Generate a tactical puzzle if none provided
      const defaultPuzzle = {
        fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
        solution: ['Bxf7+', 'Kxf7', 'Ng5+'],
        theme: 'Fork',
      };
      chess.load(defaultPuzzle.fen);
      setBoardPosition(chess.fen());
      puzzle.solution = defaultPuzzle.solution;
      showCoachIntro();
    }
  }, []);

  const showCoachIntro = () => {
    setCoachMessage(`${coach.emoji} ${coach.name}: "${getIntroMessage()}"`);
    animateMessage();
  };

  const getIntroMessage = () => {
    const intros = {
      tactical: "Time to unleash some tactical fury! Find the winning combination!",
      positional: "Let's improve our position step by step. What's the best plan?",
      endgame: "Precision is key in the endgame. Calculate carefully!",
    };
    return intros[agent] || intros.tactical;
  };

  const animateMessage = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleMove = (move: any) => {
    const expectedMove = puzzle.solution[moveIndex];
    const playerMove = move.san || chess.move(move)?.san;
    
    if (playerMove === expectedMove) {
      // Correct move!
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      chess.move(move);
      setBoardPosition(chess.fen());
      
      if (moveIndex + 1 >= puzzle.solution.length) {
        // Puzzle solved!
        puzzleSolved();
      } else {
        // Make opponent's response
        setMoveIndex(moveIndex + 1);
        setTimeout(() => {
          const opponentMove = puzzle.solution[moveIndex + 1];
          if (opponentMove && moveIndex + 1 < puzzle.solution.length) {
            chess.move(opponentMove);
            setBoardPosition(chess.fen());
            setMoveIndex(moveIndex + 2);
            setCoachMessage(`${coach.emoji} Good! Now find the next move...`);
          }
        }, 500);
      }
    } else {
      // Wrong move
      wrongMove();
    }
  };

  const wrongMove = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setAttempts(attempts + 1);
    
    // Show coach criticism
    const criticism = coach.criticism[Math.floor(Math.random() * coach.criticism.length)];
    setCoachMessage(`${coach.emoji} ${criticism}`);
    animateMessage();
    
    // Reset position
    setTimeout(() => {
      chess.undo();
      setBoardPosition(chess.fen());
    }, 1000);
  };

  const puzzleSolved = () => {
    setSolved(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Show coach praise
    const praise = coach.praise[Math.floor(Math.random() * coach.praise.length)];
    setCoachMessage(`${coach.emoji} ${praise}`);
    
    // Calculate score based on attempts
    const score = Math.max(100 - (attempts * 20), 20);
    
    Alert.alert(
      'Puzzle Solved! 🎉',
      `Score: ${score}/100\nAttempts: ${attempts + 1}`,
      [
        { 
          text: 'Next Puzzle', 
          onPress: () => {
            // Reset and load next puzzle
            navigation.goBack();
          }
        },
        { text: 'Review', onPress: () => {} },
      ]
    );
  };

  const getHint = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const hint = coach.hints[Math.min(attempts, coach.hints.length - 1)];
    setCoachMessage(`${coach.emoji} Hint: ${hint}`);
    setShowHint(true);
    animateMessage();
  };

  const analyzeLine = () => {
    const solution = puzzle.solution.join(' → ');
    Alert.alert(
      'Solution',
      solution,
      [{ text: 'OK' }]
    );
  };

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b']}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Coach Header */}
        <View style={styles.coachHeader}>
          <Text style={styles.coachEmoji}>{coach.emoji}</Text>
          <View style={styles.coachInfo}>
            <Text style={styles.coachName}>{coach.name}</Text>
            <Text style={styles.coachStyle}>Style: {coach.style}</Text>
          </View>
        </View>

        {/* Coach Message */}
        <Animated.View style={[styles.messageContainer, { opacity: fadeAnim }]}>
          <Text style={styles.coachMessage}>{coachMessage}</Text>
        </Animated.View>

        {/* Puzzle Info */}
        <View style={styles.puzzleInfo}>
          <Text style={styles.puzzleTheme}>Theme: {puzzle.theme || 'Tactics'}</Text>
          <Text style={styles.puzzleTurn}>
            {chess.turn() === 'w' ? 'White' : 'Black'} to move
          </Text>
        </View>

        {/* Chess Board */}
        <View style={styles.boardContainer}>
          <ChessBoard
            position={boardPosition}
            onMove={handleMove}
            boardOrientation={chess.turn() === 'w' ? 'white' : 'black'}
          />
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.button, styles.hintButton]}
            onPress={getHint}
            disabled={showHint || solved}
          >
            <Text style={styles.buttonText}>💡 Get Hint</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.analyzeButton]}
            onPress={analyzeLine}
          >
            <Text style={styles.buttonText}>📊 Show Solution</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{attempts}</Text>
            <Text style={styles.statLabel}>Attempts</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{moveIndex + 1}/{puzzle.solution?.length || 0}</Text>
            <Text style={styles.statLabel}>Progress</Text>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  coachEmoji: {
    fontSize: 50,
    marginRight: 15,
  },
  coachInfo: {
    flex: 1,
  },
  coachName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  coachStyle: {
    fontSize: 16,
    color: '#94a3b8',
    textTransform: 'capitalize',
  },
  messageContainer: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  coachMessage: {
    fontSize: 16,
    color: '#f8fafc',
    lineHeight: 24,
    fontStyle: 'italic',
  },
  puzzleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  puzzleTheme: {
    fontSize: 16,
    color: '#94a3b8',
  },
  puzzleTurn: {
    fontSize: 16,
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  boardContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  hintButton: {
    backgroundColor: '#f59e0b',
  },
  analyzeButton: {
    backgroundColor: '#3b82f6',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1e293b',
    padding: 20,
    borderRadius: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  statLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
});

export default TacticalPuzzleScreen;