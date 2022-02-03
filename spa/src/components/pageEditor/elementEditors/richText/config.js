const richtextConfig = {
  options: ['inline', 'blockType', 'fontSize', 'list', 'textAlign', 'link'],
  inline: {
    options: ['bold', 'italic', 'underline', 'strikethrough']
  },
  fontSize: {
    // font-size options are:
    //   - 13px - the size of the disclaimer text
    //   - 14px - the default font-size (based on semantic.min.css)
    //   - 15px - the size of <h4> elements on the page
    //   - 16px - the size of some elements on the page
    //   - 18px - the size of <h3> elements on the page
    //   - 24px - the size of <h2> elements on the page
    options: [13, 14, 15, 16, 24]
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
