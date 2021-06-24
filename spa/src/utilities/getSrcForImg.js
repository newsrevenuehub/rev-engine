function getSrcForImg(image) {
  if (image instanceof File) {
    return URL.createObjectURL(image);
  }
  return image;
}
export default getSrcForImg;
