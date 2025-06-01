export const cartoonImage = async (file, userId, originalUrl, category)=> {
    if (!file||!userId) {
        throw new Error("No file provided for cartoonization.");
    }
    const formData = new FormData();
    formData.append('image', file, file.name);
    formData.append("userId", userId);
    formData.append("originalUrl", originalUrl);
    formData.append("category", category);
    try {
        // 3. Send the POST request using fetch
        // The browser will automatically set the Content-Type to multipart/form-data
        // when you send a FormData object.
        const response = await fetch('http://127.0.0.1:5000/cartoonize', {
            method: 'POST',
            body: formData,
        });

        // 4. Handle the response
        if (!response.ok) {
            // If the response status is not 2xx, throw an error
            // This will include 403, 400, 500, etc.
            const errorData = await response.json().catch(() => ({})); // Try to parse JSON error body
            console.error("Backend error response:", errorData);
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorData.error || 'Unknown error'}`);
        }

        // 5. Parse the successful JSON response
        const data = await response.json();

        return data; // This should contain { cartoonUrl: "..." }

    } catch (error) {
        console.error("Error calling cartoonize backend:", error);
        throw error; // Re-throw to be caught by the calling handleCartoon function
    }
}
