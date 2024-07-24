import { ScatterPlotNodeProps } from '@nivo/scatterplot';

interface ChurnDatum {
  x: number;
  y: number;
  value: number;
}

export function ChurnDataPoint({ node }: ScatterPlotNodeProps<ChurnDatum>) {
  return (
    <>
      <rect fill="#CEBDD6" x={node.x} y={node.y} width={40} height={22} rx={4} />
      <text
        x={node.x + 20}
        y={node.y + 11}
        style={{ fontSize: '12px' }}
        dominant-baseline="middle"
        text-anchor="middle"
      >
        {node.data.value.toLocaleString(undefined, { style: 'percent' })}
      </text>
    </>
  );
}

export default ChurnDataPoint;
