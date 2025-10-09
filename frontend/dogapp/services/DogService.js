import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl, getApiConfig } from "../config";
import { Platform } from "react-native";

class DogService {
  // Get auth token from storage
  async getAuthToken() {
    return await AsyncStorage.getItem("authToken");
  }

  // Helper method to make API requests with retry logic
  async makeApiRequest(endpoint, options = {}) {
    const config = getApiConfig();
    const url = getApiUrl(endpoint);

    let lastError;

    for (let attempt = 1; attempt <= config.retries; attempt++) {
      try {
        const response = await fetch(url, {
          timeout: config.timeout,
          ...options,
        });

        return response;
      } catch (error) {
        lastError = error;
        console.warn(`API request attempt ${attempt} failed:`, error);

        // Don't retry on the last attempt
        if (attempt === config.retries) {
          throw lastError;
        }

        // Wait before retrying (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      }
    }
  }

  // Get all dogs for the current user
  async getDogs() {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error("No auth token found");
      }

      const response = await this.makeApiRequest("/api/dogs", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, dogs: data.dogs };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error("Get dogs error:", error);
      return { success: false, error: "Network error. Please try again." };
    }
  }

  // Add a new dog
  async addDog(dogData) {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error("No auth token found");
      }

      const response = await this.makeApiRequest("/api/dogs", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dogData),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, dog: data.dog };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error("Add dog error:", error);
      return { success: false, error: "Network error. Please try again." };
    }
  }

  // Update an existing dog
  async updateDog(dogId, dogData) {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error("No auth token found");
      }

      const response = await this.makeApiRequest(`/api/dogs/${dogId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dogData),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, dog: data.dog };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error("Update dog error:", error);
      return { success: false, error: "Network error. Please try again." };
    }
  }

  // Delete a dog
  async deleteDog(dogId) {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error("No auth token found");
      }

      const response = await this.makeApiRequest(`/api/dogs/${dogId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error("Delete dog error:", error);
      return { success: false, error: "Network error. Please try again." };
    }
  }

  // Get a specific dog
  async getDog(dogId) {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error("No auth token found");
      }

      const response = await this.makeApiRequest(`/api/dogs/${dogId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, dog: data.dog };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error("Get dog error:", error);
      return { success: false, error: "Network error. Please try again." };
    }
  }

  // Upload a dog photo
  async uploadDogPhoto(dogId, photoUriOrFile) {
    try {
      const token = await this.getAuthToken();
      if (!token) {
        throw new Error("No auth token found");
      }

      console.log(
        "📤 Uploading photo for dog:",
        dogId,
        "Platform:",
        Platform.OS
      );

      // Create FormData for file upload
      const formData = new FormData();

      if (Platform.OS === "web") {
        // Web: photoUriOrFile is an object with a 'file' property containing the actual File object
        // Extract the file from the photo object if it exists
        let file;
        if (typeof photoUriOrFile === "object" && photoUriOrFile.file) {
          file = photoUriOrFile.file;
        } else if (typeof photoUriOrFile === "string") {
          // If it's a string URI, we need to fetch it and convert to blob
          const response = await fetch(photoUriOrFile);
          const blob = await response.blob();
          file = new File([blob], "dog-photo.jpg", { type: "image/jpeg" });
        } else {
          file = photoUriOrFile;
        }

        console.log(
          "🌐 Web: Appending file to FormData:",
          file.name,
          file.type,
          file.size
        );
        formData.append("photo", file);
      } else {
        // Native: photoUriOrFile is an object with uri property
        const photoUri =
          typeof photoUriOrFile === "string"
            ? photoUriOrFile
            : photoUriOrFile.uri;
        console.log("📱 Native: Appending photo with URI:", photoUri);

        formData.append("photo", {
          uri: photoUri,
          type: "image/jpeg",
          name: "dog-photo.jpg",
        });
      }

      const response = await this.makeApiRequest(`/api/dogs/${dogId}/photo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // Don't set Content-Type for multipart/form-data - let the browser/fetch set it with boundary
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        console.log("✅ Photo uploaded successfully:", data.photoUrl);
        return { success: true, photoUrl: data.photoUrl };
      } else {
        console.error("❌ Photo upload failed:", data.error);
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error("💥 Upload photo error:", error);
      return { success: false, error: "Network error. Please try again." };
    }
  }
}

export default new DogService();
