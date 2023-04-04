import { OrganizationMenuProps } from '../OrganizationMenu';

export const OrganizationMenu = ({ title }: OrganizationMenuProps) => (
  <div data-testid="mock-organization-menu">{title}</div>
);

export default OrganizationMenu;
