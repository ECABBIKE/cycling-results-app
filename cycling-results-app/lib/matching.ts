import levenshtein from 'fast-levenshtein';

export interface RiderMatch {
  rider1Id: string;
  rider2Id: string;
  similarity: number;
  reasons: string[];
}

interface RiderData {
  id: string;
  firstName: string;
  lastName: string;
  club: string | null;
  uciId: string | null;
}

/**
 * Normaliserar en sträng för jämförelse
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // Ta bort accenter
}

/**
 * Beräknar likhet mellan två strängar (0-1)
 */
function stringSimilarity(str1: string, str2: string): number {
  const s1 = normalize(str1);
  const s2 = normalize(str2);
  
  if (s1 === s2) return 1;
  if (!s1 || !s2) return 0;
  
  const maxLen = Math.max(s1.length, s2.length);
  const distance = levenshtein.get(s1, s2);
  
  return 1 - (distance / maxLen);
}

/**
 * Kontrollerar om två strängar är mycket lika (för att fånga stavfel)
 */
function areVeryimilar(str1: string, str2: string, threshold: number = 0.85): boolean {
  return stringSimilarity(str1, str2) >= threshold;
}

/**
 * Hittar potentiella dubbletter bland riders
 */
export function findDuplicates(riders: RiderData[], similarityThreshold: number = 0.75): RiderMatch[] {
  const matches: RiderMatch[] = [];
  const processed = new Set<string>();

  for (let i = 0; i < riders.length; i++) {
    for (let j = i + 1; j < riders.length; j++) {
      const r1 = riders[i];
      const r2 = riders[j];
      
      const pairKey = [r1.id, r2.id].sort().join('|');
      if (processed.has(pairKey)) continue;
      
      const reasons: string[] = [];
      let totalSimilarity = 0;
      let factorCount = 0;

      // UCI ID match (högsta prioritet)
      if (r1.uciId && r2.uciId && !r1.uciId.startsWith('TEMP') && !r2.uciId.startsWith('TEMP')) {
        if (r1.uciId === r2.uciId) {
          reasons.push('Samma UCI ID');
          totalSimilarity = 1;
          factorCount = 1;
        } else {
          // Olika UCI ID betyder olika personer
          continue;
        }
      } else {
        // Jämför namn
        const firstNameSim = stringSimilarity(r1.firstName, r2.firstName);
        const lastNameSim = stringSimilarity(r1.lastName, r2.lastName);
        
        totalSimilarity += firstNameSim;
        totalSimilarity += lastNameSim;
        factorCount += 2;

        if (firstNameSim >= 0.9 && lastNameSim >= 0.9) {
          reasons.push('Mycket liknande namn');
        } else if (firstNameSim >= 0.75 || lastNameSim >= 0.75) {
          reasons.push('Liknande namn');
        }

        // Jämför klubb om den finns
        if (r1.club && r2.club) {
          const clubSim = stringSimilarity(r1.club, r2.club);
          totalSimilarity += clubSim;
          factorCount += 1;

          if (clubSim >= 0.9) {
            reasons.push('Samma klubb');
          } else if (clubSim >= 0.7) {
            reasons.push('Liknande klubb');
          }
        }

        // Exakt namnmatchning med olika stavning på klubb
        if (normalize(r1.firstName) === normalize(r2.firstName) && 
            normalize(r1.lastName) === normalize(r2.lastName)) {
          reasons.push('Exakt samma namn');
          totalSimilarity += 0.5;
          factorCount += 0.5;
        }

        // Bytt förnamn och efternamn
        if (areVeryimilar(r1.firstName, r2.lastName) && areVeryimilar(r1.lastName, r2.firstName)) {
          reasons.push('Namn kan vara ombytta');
          totalSimilarity += 0.3;
          factorCount += 0.3;
        }
      }

      const avgSimilarity = factorCount > 0 ? totalSimilarity / factorCount : 0;

      if (avgSimilarity >= similarityThreshold && reasons.length > 0) {
        matches.push({
          rider1Id: r1.id,
          rider2Id: r2.id,
          similarity: avgSimilarity,
          reasons
        });
        processed.add(pairKey);
      }
    }
  }

  // Sortera efter högst likhet först
  return matches.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Grupperar dubletter i kluster
 */
export function groupDuplicates(matches: RiderMatch[]): string[][] {
  const groups: Map<string, Set<string>> = new Map();
  const processed = new Set<string>();

  for (const match of matches) {
    const { rider1Id, rider2Id } = match;
    
    // Hitta befintlig grupp
    let group: Set<string> | undefined;
    for (const [key, g] of groups.entries()) {
      if (g.has(rider1Id) || g.has(rider2Id)) {
        group = g;
        break;
      }
    }

    if (group) {
      group.add(rider1Id);
      group.add(rider2Id);
    } else {
      const newGroup = new Set([rider1Id, rider2Id]);
      groups.set(rider1Id, newGroup);
    }
  }

  return Array.from(groups.values()).map(g => Array.from(g));
}
