// Required to import .svg files to TS files
declare module '*.svg' {
  const content: any;
  export default content;
}

// Required to import .png files to TS files
declare module '*.png' {
  const content: any;
  export default content;
}
