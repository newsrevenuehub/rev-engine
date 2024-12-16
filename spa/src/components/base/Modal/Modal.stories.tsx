import { Face } from '@material-ui/icons';
import { Meta, StoryFn } from '@storybook/react';
import Button from '../Button/Button';
import { Modal } from './Modal';
import { ModalContent } from './ModalContent';
import { ModalFooter } from './ModalFooter';
import { ModalHeader } from './ModalHeader';

export default {
  args: {
    open: true
  },
  argTypes: {
    open: {
      control: 'boolean'
    }
  },
  component: Modal,
  title: 'Base/Modal'
} as Meta<typeof Modal>;

const CloseableTemplate: StoryFn<typeof Modal> = (args) => (
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

const UncloseableTemplate: StoryFn<typeof Modal> = (args) => (
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

const CloseableTallTitleTemplate: StoryFn<typeof Modal> = (args) => (
  <Modal width={400} {...args}>
    <ModalHeader icon={<Face />} onClose={() => {}}>
      <strong>Modal Header</strong>
      <br />A second line
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

export const CloseableTallTitle = CloseableTallTitleTemplate.bind({});
