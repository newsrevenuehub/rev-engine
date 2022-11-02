import { Face } from '@material-ui/icons';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import Button from '../Button/Button';
import { Modal } from './Modal';
import { ModalContent } from './ModalContent';
import { ModalFooter } from './ModalFooter';
import { ModalHeader } from './ModalHeader';

export default {
  argTypes: {
    open: {
      control: 'boolean',
      defaultValue: true
    }
  },
  component: Modal,
  title: 'Base/Modal'
} as ComponentMeta<typeof Modal>;

const CloseableTemplate: ComponentStory<typeof Modal> = (args) => (
  <Modal width={400} {...args}>
    <ModalHeader icon={<Face />} onClose={() => {}}>
      <strong>Modal Header</strong>
    </ModalHeader>
    <ModalContent>
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum nec tincidunt dui, sed hendrerit erat.
      Suspendisse libero eros, pulvinar ac tellus non, tincidunt mollis lacus.
    </ModalContent>
    <ModalFooter>
      <Button color="secondary">Cancel</Button>
      <Button>OK</Button>
    </ModalFooter>
  </Modal>
);

export const Closeable = CloseableTemplate.bind({});

const UncloseableTemplate: ComponentStory<typeof Modal> = (args) => (
  <Modal width={400} {...args}>
    <ModalHeader icon={<Face />}>
      <strong>Modal Header</strong>
    </ModalHeader>
    <ModalContent>
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum nec tincidunt dui, sed hendrerit erat.
      Suspendisse libero eros, pulvinar ac tellus non, tincidunt mollis lacus.
    </ModalContent>
    <ModalFooter>
      <Button color="secondary">Cancel</Button>
      <Button>OK</Button>
    </ModalFooter>
  </Modal>
);

export const Uncloseable = UncloseableTemplate.bind({});
