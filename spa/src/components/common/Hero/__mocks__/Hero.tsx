import { HeroProps } from '../Hero';

const Hero = ({ title, subtitle, onChange, exportData }: HeroProps) => {
  const showExport = !!exportData?.email;

  return (
    <div data-testid="mock-hero" data-title={title} data-subtitle={subtitle}>
      {(showExport || onChange) && (
        <div data-testid="right-action" data-hasexport={showExport} data-haschange={!!onChange} />
      )}
    </div>
  );
};

export default Hero;
