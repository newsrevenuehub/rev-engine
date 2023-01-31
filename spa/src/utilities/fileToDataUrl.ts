/**
 * Returns a data URI for an in-browser file.
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      if (!event.target) {
        reject(new Error('FileReader has no target property on load event'));
      }

      resolve(event.target!.result as string);
    };
    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}

export default fileToDataUrl;
