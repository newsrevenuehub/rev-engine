import { ResponsiveScatterPlot } from '@nivo/scatterplot';
import { useMemo } from 'react';
import { CircularProgress } from 'components/base';
import { useRevenueProgramChurn } from 'hooks/useRevenueProgramChurn';
import { Heading, Legend } from './Churn.styled';
import ChurnDataPoint from './ChurnDataPoint';

export function Churn() {
  const { churn } = useRevenueProgramChurn('TODO');
  const chartData = useMemo(() => {
    if (!churn) {
      return undefined;
    }

    const maxChurn = Object.keys(churn['2023']).reduce<number>((result, month) => {
      const { churn_rate } = churn['2023'][month];

      return churn_rate > result ? churn_rate : result;
    }, 0);

    return [
      {
        id: 'Label',
        data: Object.keys(churn['2023']).map((month) => ({
          value: churn['2023'][month].churn_rate,
          x: parseInt(month),
          y: maxChurn - churn['2023'][month].churn_rate
        }))
      }
    ];
  }, [churn]);

  return (
    <>
      <Heading>Churn</Heading>
      <Legend>This is hardcoded to show 2023 data only.</Legend>
      {chartData ? <ResponsiveScatterPlot nodeComponent={ChurnDataPoint} data={chartData} /> : <CircularProgress />}
    </>
  );
}

export default Churn;
