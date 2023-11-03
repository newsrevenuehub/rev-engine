import AvatarMenu from './AvatarMenu';

export default {
  title: 'Common/AvatarMenu',
  component: AvatarMenu
};

export const Default = (props) => (
  <div style={{ background: '#523A5E', display: 'flex', justifyContent: 'end' }}>
    <AvatarMenu {...props} />
  </div>
);

Default.args = {
  user: {
    firstName: 'Gui',
    lastName: 'Mend',
    email: 'gm@gmail.com'
  }
};

export const NoNameAvatar = (props) => (
  <div style={{ background: '#523A5E', display: 'flex', justifyContent: 'end' }}>
    <AvatarMenu {...props} />
  </div>
);

NoNameAvatar.args = {
  user: {
    email: 'gm@gmail.com'
  }
};

export const EmptyAvatar = (props) => (
  <div style={{ background: '#523A5E', display: 'flex', justifyContent: 'end' }}>
    <AvatarMenu {...props} />
  </div>
);

EmptyAvatar.args = {};
