const richtextConfig = {
  options: ['inline', 'blockType', 'list', 'textAlign', 'link'],
  inline: {
    options: ['bold', 'italic', 'underline', 'strikethrough']
  },
  blockType: {
    inDropdown: false,
    options: ['Normal', 'H2', 'H3', 'H4', 'Blockquote']
  },
  link: {
    defaultTargetOption: '_blank'
  }
};

export default richtextConfig;
