import PropTypes, { InferProps } from 'prop-types';

const ChurnDataPointPropTypes = {
  node: {
    data: { value: PropTypes.number.isRequired },
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired
  }
};

export type ChurnDataPointProps = InferProps<typeof ChurnDataPointPropTypes>;

export function ChurnDataPoint({ node }: ChurnDataPointProps) {
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

ChurnDataPoint.propTypes = ChurnDataPointPropTypes;
export default ChurnDataPoint;
