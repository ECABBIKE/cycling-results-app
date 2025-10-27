export const POINT_SYSTEMS = {
  ENDURO: [500,450,425,400,380,360,340,320,300,280,260,240,220,200,190,180,170,160,150,140,135,130,125,120,115,110,105,100,95,90,85,80,75,70,65,60,55,50,45,40,35,30,25,20,19,18,17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1],
  DH_KVAL: [100,80,60,55,50,45,40,35,30,20,18,16,14,12,10,9,8,7,6,5,4,3,2,1],
  DH_RACE: [420,370,365,345,330,315,300,285,270,260,242,224,206,188,180,171,162,153,144,135,131,127,123,119,115,110,105,100,95,90,85,80,75,70,65,60,55,50,45,40,35,30,25,20,19,18,17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1],
  OTHERS: [250,225,212,200,190,180,170,160,150,140,130,120,110,100,95,90,85,80,75,70,68,65,62,60,57,55,52,50,47,45,42,40,37,35,32,30,27,25,22,20,17,15,12,10,9,8,7,6,5,4,3,2,1]
};

export type PointSystemType = keyof typeof POINT_SYSTEMS | 'CUSTOM';

export function calculatePoints(position: number, systemType: PointSystemType, customPoints?: number[]): number {
  if (systemType === 'CUSTOM' && customPoints) {
    return customPoints[position - 1] || 0;
  }
  
  const points = POINT_SYSTEMS[systemType as keyof typeof POINT_SYSTEMS];
  if (!points) return 0;
  
  return points[position - 1] || 0;
}

export function getPointSystemName(type: string): string {
  const names: Record<string, string> = {
    ENDURO: 'Enduro',
    DH_KVAL: 'DH Kval',
    DH_RACE: 'DH Race',
    OTHERS: 'Övriga',
    CUSTOM: 'Anpassat'
  };
  return names[type] || type;
}
