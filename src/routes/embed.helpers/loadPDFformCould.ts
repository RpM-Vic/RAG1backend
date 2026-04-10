export async function loadBookFromCloud(url: string):Promise<ArrayBuffer> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/pdf',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Get the PDF as ArrayBuffer
    return await response.arrayBuffer();
  } catch (e) {
    throw new Error;
  }
}
