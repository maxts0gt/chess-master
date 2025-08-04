// Offline Chess Teacher - Natural Language Explanations
// Provides human-like explanations without requiring AI

interface TeacherPersonality {
  greetings: string[];
  encouragements: string[];
  warnings: string[];
  style: 'friendly' | 'professional' | 'casual';
}

export class OfflineChessTeacher {
  private moveCount = 0;
  private personality: TeacherPersonality;
  
  constructor() {
    this.personality = this.getRandomPersonality();
  }

  private getRandomPersonality(): TeacherPersonality {
    const personalities: TeacherPersonality[] = [
      {
        style: 'friendly',
        greetings: [
          "Nice move! Let me explain why this works well...",
          "Interesting choice! Here's what this accomplishes...",
          "Good thinking! This move does several things...",
          "I like this move! Let's see why it's effective..."
        ],
        encouragements: [
          "You're getting the hang of this!",
          "That's the spirit!",
          "Keep it up!",
          "You're improving!"
        ],
        warnings: [
          "Be careful though...",
          "Watch out for...",
          "Keep an eye on...",
          "Don't forget about..."
        ]
      },
      {
        style: 'professional',
        greetings: [
          "This move demonstrates good understanding.",
          "A principled approach.",
          "This follows classical chess theory.",
          "A well-considered move."
        ],
        encouragements: [
          "Correct application of principles.",
          "Good strategic thinking.",
          "Sound positional play.",
          "Proper technique."
        ],
        warnings: [
          "However, be aware of...",
          "Note the potential for...",
          "Consider also...",
          "Be mindful of..."
        ]
      },
      {
        style: 'casual',
        greetings: [
          "Oh, that's a fun move!",
          "Alright, let's break this down...",
          "Cool choice! Here's why...",
          "Yeah, I see what you're doing..."
        ],
        encouragements: [
          "You got this!",
          "Nice one!",
          "That works!",
          "Smart thinking!"
        ],
        warnings: [
          "Just watch out for...",
          "Heads up though...",
          "Quick tip: watch for...",
          "BTW, keep an eye on..."
        ]
      }
    ];
    
    return personalities[Math.floor(Math.random() * personalities.length)];
  }

  explainMove(moveObj: any, chess: any, gamePhase: string): string {
    this.moveCount++;
    
    // Build explanation with natural variations
    const parts: string[] = [];
    
    // Opening greeting (varies)
    parts.push(this.getGreeting(moveObj, gamePhase));
    
    // Main explanation (contextual)
    parts.push(this.getMainExplanation(moveObj, chess, gamePhase));
    
    // Additional insights (sometimes)
    if (Math.random() > 0.5) {
      parts.push(this.getAdditionalInsight(moveObj, chess, gamePhase));
    }
    
    // Warning or tip (occasionally)
    if (Math.random() > 0.7) {
      parts.push(this.getWarningOrTip(chess));
    }
    
    return parts.join(' ');
  }

  private getGreeting(moveObj: any, gamePhase: string): string {
    // Special greetings for special moves
    if (moveObj.flags.includes('k') || moveObj.flags.includes('q')) {
      return this.sample([
        "Excellent decision to castle!",
        "Good call on castling!",
        "Smart move - getting your king to safety!",
        "Yes! Castling is crucial!"
      ]);
    }
    
    if (moveObj.captured) {
      return this.sample([
        "A capture! Let's see what you've won...",
        "Taking material - always worth considering!",
        "Exchanging pieces, interesting...",
        "A tactical strike!"
      ]);
    }
    
    // Phase-specific greetings
    if (gamePhase === 'opening') {
      return this.sample([
        "Good opening development!",
        "Building your position nicely...",
        "Setting up your pieces well!",
        "Following opening principles!"
      ]);
    }
    
    // Default greetings from personality
    return this.sample(this.personality.greetings);
  }

  private getMainExplanation(moveObj: any, chess: any, gamePhase: string): string {
    const explanations: string[] = [];
    
    // Piece-specific explanations with variations
    switch (moveObj.piece.toLowerCase()) {
      case 'p':
        explanations.push(...this.getPawnExplanations(moveObj, gamePhase));
        break;
      case 'n':
        explanations.push(...this.getKnightExplanations(moveObj, gamePhase));
        break;
      case 'b':
        explanations.push(...this.getBishopExplanations(moveObj, gamePhase));
        break;
      case 'r':
        explanations.push(...this.getRookExplanations(moveObj, gamePhase));
        break;
      case 'q':
        explanations.push(...this.getQueenExplanations(moveObj, gamePhase));
        break;
      case 'k':
        explanations.push(...this.getKingExplanations(moveObj, gamePhase));
        break;
    }
    
    // Add check/checkmate explanations
    if (chess.isCheckmate()) {
      return "Checkmate! Brilliant! You've won the game with this move!";
    } else if (chess.inCheck()) {
      explanations.push(this.sample([
        "And it gives check! Your opponent must respond to the threat.",
        "Check! Forcing your opponent's hand.",
        "Putting the king in check - always a powerful move!",
        "Check! This limits your opponent's options significantly."
      ]));
    }
    
    return this.sample(explanations);
  }

  private getPawnExplanations(moveObj: any, gamePhase: string): string[] {
    const file = moveObj.to[0];
    const rank = moveObj.to[1];
    const color = moveObj.color;
    
    const explanations: string[] = [];
    
    // Center pawns
    if ((file === 'e' || file === 'd') && (rank === '4' || rank === '5')) {
      explanations.push(
        "This pawn move fights for the center - exactly what you want in the opening!",
        "Controlling the center with pawns is one of the most important opening principles.",
        "By advancing this pawn, you're claiming important central territory.",
        "This central pawn advance gives your pieces more room to develop."
      );
    }
    
    // Pawn captures
    if (moveObj.captured) {
      explanations.push(
        "Pawn captures often open up files for your rooks and diagonals for bishops.",
        "This capture changes the pawn structure - notice how it affects both positions.",
        "Trading pawns can lead to more open positions where pieces become powerful.",
        "Good eye! This pawn capture improves your position while removing an enemy piece."
      );
    }
    
    // Advanced pawns
    if ((color === 'w' && rank >= '6') || (color === 'b' && rank <= '3')) {
      explanations.push(
        "This pawn is getting dangerously close to promotion!",
        "Advanced pawns like this can become very powerful, especially in endgames.",
        "Your opponent will need to deal with this advancing pawn soon.",
        "Push it forward! Advanced pawns restrict your opponent's pieces."
      );
    }
    
    // Wing pawns
    if (file === 'a' || file === 'h') {
      explanations.push(
        "Wing pawn advances can be useful for gaining space on the flanks.",
        "This creates potential for a pawn storm on this side of the board.",
        "Sometimes these edge pawns can support piece activity on the wings.",
        "Flank attacks like this work best when the center is stable."
      );
    }
    
    return explanations;
  }

  private getKnightExplanations(moveObj: any, gamePhase: string): string[] {
    const to = moveObj.to;
    const explanations: string[] = [];
    
    // Central squares
    if (['e4', 'e5', 'd4', 'd5', 'c5', 'c4', 'f4', 'f5'].includes(to)) {
      explanations.push(
        "Perfect! Knights love being in the center where they can reach many squares.",
        "A centralized knight is worth its weight in gold - it controls up to 8 squares!",
        "This knight placement puts pressure on your opponent's position.",
        "From here, your knight eyes several important squares."
      );
    }
    
    // Outposts
    if (to[1] === '5' || to[1] === '6' || to[1] === '4' || to[1] === '3') {
      explanations.push(
        "This could be a strong outpost for your knight if it's supported by pawns.",
        "Knights on advanced squares like this can dominate the position.",
        "An advanced knight can be worth more than a rook in the right position!",
        "This aggressive knight placement will make your opponent uncomfortable."
      );
    }
    
    // Development moves
    if (gamePhase === 'opening') {
      explanations.push(
        "Developing your knight toward the center - textbook opening play!",
        "Knights before bishops is often good advice in the opening.",
        "Getting your pieces out and ready for action - well done!",
        "This develops a piece while keeping future options open."
      );
    }
    
    return explanations;
  }

  private getBishopExplanations(moveObj: any, gamePhase: string): string[] {
    const explanations: string[] = [];
    
    if (moveObj.captured) {
      explanations.push(
        "Bishops are excellent at long-range captures like this!",
        "Using the bishop's diagonal power to win material.",
        "This capture opens up the position for your bishop.",
        "Good use of the bishop's long-range capabilities!"
      );
    }
    
    // Fianchetto positions
    if (moveObj.to === 'g2' || moveObj.to === 'b2' || moveObj.to === 'g7' || moveObj.to === 'b7') {
      explanations.push(
        "A fianchettoed bishop can control long diagonals very effectively.",
        "This bishop will have a great view of the center from here.",
        "Fianchetto setups are solid and give long-term pressure.",
        "From this square, your bishop influences the entire diagonal."
      );
    }
    
    // General development
    explanations.push(
      "Bishops need open diagonals to be effective - this helps achieve that.",
      "Developing this bishop increases your piece coordination.",
      "Long-range pieces like bishops work best when they have scope.",
      "This bishop development prepares for the middlegame."
    );
    
    return explanations;
  }

  private getRookExplanations(moveObj: any, gamePhase: string): string[] {
    const file = moveObj.to[0];
    const rank = moveObj.to[1];
    const explanations: string[] = [];
    
    // Seventh rank
    if (rank === '7' || rank === '2') {
      explanations.push(
        "Rook on the seventh rank! This is one of the most powerful placements.",
        "A seventh rank rook can wreak havoc on your opponent's position.",
        "This rook now attacks pawns and restricts the enemy king.",
        "Dominant rook placement! It cuts off the opponent's pieces."
      );
    }
    
    // Central files
    if (file === 'd' || file === 'e') {
      explanations.push(
        "Centralizing your rook on this file gives maximum influence.",
        "Rooks on central files often become very active.",
        "This rook now controls one of the most important files.",
        "Central rook placement - preparing for tactical opportunities."
      );
    }
    
    // Open files
    explanations.push(
      "Rooks belong on open or semi-open files where they can be active.",
      "This rook move improves its scope and potential.",
      "Activating your rooks is crucial for the middlegame.",
      "Good rook lift! Getting this piece into the action."
    );
    
    return explanations;
  }

  private getQueenExplanations(moveObj: any, gamePhase: string): string[] {
    const explanations: string[] = [];
    
    if (gamePhase === 'opening' && this.moveCount < 10) {
      explanations.push(
        "Be careful with early queen moves - it can become a target!",
        "Queen development is tricky - make sure it won't be harassed by enemy pieces.",
        "Early queen sorties need to have a clear purpose.",
        "Remember: knights and bishops usually develop before the queen."
      );
    } else {
      explanations.push(
        "The queen is your most powerful piece - use it wisely!",
        "A well-placed queen can dominate the board.",
        "This queen move increases your attacking potential.",
        "Your queen now influences multiple areas of the board."
      );
    }
    
    return explanations;
  }

  private getKingExplanations(moveObj: any, gamePhase: string): string[] {
    const explanations: string[] = [];
    
    if (gamePhase === 'endgame') {
      explanations.push(
        "In the endgame, the king transforms from weakling to warrior!",
        "King activity is crucial in endgames - well done activating it.",
        "An active king can make the difference between winning and drawing.",
        "Your king joins the battle - a sign of good endgame technique!"
      );
    } else {
      explanations.push(
        "King moves in the middlegame need to balance safety with activity.",
        "Making sure your king stays safe while improving its position.",
        "Sometimes a timely king move prevents future problems.",
        "King safety first, but don't forget it needs some breathing room!"
      );
    }
    
    return explanations;
  }

  private getAdditionalInsight(moveObj: any, chess: any, gamePhase: string): string {
    const insights: string[] = [];
    
    // Game phase insights
    if (gamePhase === 'opening') {
      insights.push(
        "Remember the opening principles: control center, develop pieces, castle early!",
        "In the opening, each move should help develop your position.",
        "Try to develop all your pieces before moving any piece twice.",
        "Opening tip: Knights before bishops, castle before attacking!"
      );
    } else if (gamePhase === 'endgame') {
      insights.push(
        "In endgames, king activity and pawn play become crucial.",
        "Endgame principle: activate your king and push passed pawns!",
        "Every move counts in the endgame - precision is key.",
        "Remember: endgames are about technique, not tactics."
      );
    }
    
    // Tactical insights
    if (moveObj.captured) {
      insights.push(
        "When capturing, always check if your opponent can recapture favorably.",
        "Material advantage often leads to victory, but position matters too!",
        "Good exchanges simplify the position when you're ahead.",
        "Trading pieces when ahead is usually a good strategy."
      );
    }
    
    return this.sample(insights);
  }

  private getWarningOrTip(chess: any): string {
    const warnings = [
      ...this.personality.warnings,
      "Always check for tactical threats before moving.",
      "Don't forget to look at your opponent's possibilities too.",
      "Chess is about patterns - this position reminds me of...",
      "A good rule of thumb here is to..."
    ];
    
    return this.sample(warnings) + " " + this.getContextualTip(chess);
  }

  private getContextualTip(chess: any): string {
    const tips: string[] = [];
    
    // Check for hanging pieces (simplified)
    tips.push("make sure your pieces are protected.");
    tips.push("check if any pieces are hanging.");
    tips.push("look for any undefended pieces.");
    
    // General tips
    tips.push("improve your worst-placed piece.");
    tips.push("think about your opponent's plan.");
    tips.push("consider the pawn structure.");
    
    return this.sample(tips);
  }

  private sample<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  getLearningPoints(moveObj: any, gamePhase: string): string[] {
    const points: string[] = [];
    
    // Universal principles
    points.push(
      "Every move should have a purpose",
      "Think about your opponent's options",
      "Piece coordination is key",
      "Control important squares",
      "Improve your worst piece"
    );
    
    // Phase-specific
    if (gamePhase === 'opening') {
      points.push(
        "Develop pieces toward the center",
        "Castle early for king safety",
        "Don't move the same piece twice",
        "Control the center with pawns"
      );
    } else if (gamePhase === 'middlegame') {
      points.push(
        "Create weaknesses in enemy position",
        "Improve piece coordination",
        "Look for tactical opportunities",
        "Plan before you move"
      );
    } else {
      points.push(
        "Activate your king",
        "Create passed pawns",
        "Centralize your king",
        "Push passed pawns"
      );
    }
    
    // Return 3 random relevant points
    return this.shuffle(points).slice(0, 3);
  }

  private shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  getStrategicAssessment(): string {
    const assessments = [
      "Building your position! 🏗️",
      "Solid play! 👍",
      "Tactical opportunity! ⚔️",
      "Improving piece placement! 📈",
      "Strategic maneuvering! 🎯",
      "Aggressive play! 🔥",
      "Defensive consolidation! 🛡️",
      "Positional understanding! 🧩",
      "Creative approach! 💡",
      "Classical technique! 📚"
    ];
    
    return this.sample(assessments);
  }
}

// Singleton instance
export const offlineTeacher = new OfflineChessTeacher();