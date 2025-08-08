import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { GameReview } from '../services/historyService';
import { theme } from '../styles/theme';

interface ReviewScreenProps {
  review: GameReview;
  onDrill: (fen: string) => void;
  onClose: () => void;
}

export const ReviewScreen: React.FC<ReviewScreenProps> = ({ review, onDrill, onClose }) => {
  const [worst, setWorst] = useState<number>(0);

  useEffect(() => {
    const idx = review.moves.reduce((acc, m, i) => Math.abs(m.delta) > Math.abs(review.moves[acc]?.delta || 0) ? i : acc, 0);
    setWorst(idx);
  }, [review]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Post-game Review</Text>
        <Text style={styles.subtitle}>{new Date(review.createdAt).toLocaleString()} • {review.result.toUpperCase()}</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={{ padding: theme.spacing.lg }}>
        {review.moves.map((m, i) => (
          <View key={i} style={[styles.moveRow, i === worst && styles.worstRow]}>
            <Text style={styles.moveNum}>{m.index}.</Text>
            <Text style={styles.moveSan}>{m.moveSan}</Text>
            <Text style={styles.moveEval}>{(m.evalAfter >= 0 ? '+' : '') + m.evalAfter.toFixed(1)}</Text>
            {m.isBlunder && (
              <TouchableOpacity style={styles.drillBtn} onPress={() => onDrill(m.fenAfter)}>
                <Text style={styles.drillText}>Drill</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
      <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
        <Text style={styles.closeText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.default },
  header: { padding: theme.spacing.lg, backgroundColor: theme.colors.surface.elevated },
  title: { ...theme.typography.titleLarge, color: theme.colors.text.primary },
  subtitle: { ...theme.typography.bodySmall, color: theme.colors.text.secondary, marginTop: 4 },
  scroll: { flex: 1 },
  moveRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  worstRow: { backgroundColor: theme.colors.error + '10', borderRadius: 8 },
  moveNum: { width: 40, color: theme.colors.text.secondary },
  moveSan: { flex: 1, color: theme.colors.text.primary },
  moveEval: { width: 80, textAlign: 'right', color: theme.colors.text.secondary },
  drillBtn: { marginLeft: 8, backgroundColor: theme.colors.primary.main, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4 },
  drillText: { color: theme.colors.primary.contrast, ...(theme.typography.labelSmall as any), fontWeight: '500' },
  closeBtn: { margin: theme.spacing.lg, alignItems: 'center', padding: theme.spacing.md, backgroundColor: theme.colors.surface.elevated, borderRadius: 12 },
  closeText: { color: theme.colors.text.primary, ...(theme.typography.labelMedium as any), fontWeight: '600' },
});