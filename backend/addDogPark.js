#!/usr/bin/env node

const readline = require("readline");
const { dogParksCollection, serverTimestamp } = require("./config/database");
const { admin } = require("./firebase-config");

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Promisify readline question
const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

// Helper function to parse amenities from comma-separated string
const parseAmenities = (input) => {
  if (!input || input.trim() === "") return [];
  return input
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

// Helper function to parse location (latitude, longitude)
const parseLocation = (input) => {
  const parts = input.split(",").map((part) => part.trim());
  if (parts.length !== 2) {
    throw new Error("Location must be in format: latitude, longitude");
  }
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);

  if (isNaN(lat) || isNaN(lng)) {
    throw new Error("Invalid latitude or longitude values");
  }

  if (lat < -90 || lat > 90) {
    throw new Error("Latitude must be between -90 and 90");
  }

  if (lng < -180 || lng > 180) {
    throw new Error("Longitude must be between -180 and 180");
  }

  return new admin.firestore.GeoPoint(lat, lng);
};

// Main function to add a dog park
async function addDogPark() {
  try {
    console.log("\n🐕 Dog Park Addition Tool 🏞️");
    console.log("================================\n");

    // Get park name
    const name = await question("Enter park name: ");
    if (!name || name.trim() === "") {
      throw new Error("Park name is required");
    }

    // Get park address
    const address = await question("Enter park address: ");
    if (!address || address.trim() === "") {
      throw new Error("Park address is required");
    }

    // Get location (geopoint)
    console.log("\nEnter location coordinates (e.g., 32.155698, 34.844439):");
    const locationInput = await question("Latitude, Longitude: ");
    const location = parseLocation(locationInput);

    // Get amenities
    console.log(
      "\nEnter amenities separated by commas (e.g., Water Fountain, Fenced, Benches):"
    );
    const amenitiesInput = await question("Amenities: ");
    const amenities = parseAmenities(amenitiesInput);

    // Get image URL (optional)
    const imageUrl = await question(
      "Enter image URL (optional, press Enter to skip): "
    );

    // Prepare park data
    const parkData = {
      name: name.trim(),
      address: address.trim(),
      location: location,
      amenities: amenities,
      checkedInDogs: [], // Initialize with empty array
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    };

    // Add image URL if provided
    if (imageUrl && imageUrl.trim() !== "") {
      parkData.image_url = imageUrl.trim();
    }

    // Show summary
    console.log("\n📋 Park Summary:");
    console.log("================");
    console.log(`Name: ${parkData.name}`);
    console.log(`Address: ${parkData.address}`);
    console.log(`Location: ${location.latitude}°, ${location.longitude}°`);
    console.log(
      `Amenities: ${amenities.length > 0 ? amenities.join(", ") : "None"}`
    );
    console.log(`Image URL: ${parkData.image_url || "None"}`);
    console.log("");

    const confirm = await question("Add this park to the database? (yes/no): ");

    if (confirm.toLowerCase() !== "yes" && confirm.toLowerCase() !== "y") {
      console.log("\n❌ Park addition cancelled.");
      rl.close();
      process.exit(0);
    }

    // Add park to Firestore
    console.log("\n⏳ Adding park to database...");
    const parkDoc = await dogParksCollection.add(parkData);

    console.log("\n✅ Dog park added successfully!");
    console.log(`📍 Park ID: ${parkDoc.id}`);
    console.log(`🏞️ Park Name: ${parkData.name}`);
    console.log(`📌 Address: ${parkData.address}`);
    console.log(`🌍 Location: ${location.latitude}°N, ${location.longitude}°E`);

    // Ask if user wants to add another park
    console.log("");
    const addAnother = await question("Add another park? (yes/no): ");

    if (
      addAnother.toLowerCase() === "yes" ||
      addAnother.toLowerCase() === "y"
    ) {
      console.log("\n");
      await addDogPark(); // Recursive call
    } else {
      console.log("\n👋 Goodbye!");
      rl.close();
      process.exit(0);
    }
  } catch (error) {
    console.error("\n❌ Error adding dog park:", error.message);
    console.log("");

    const retry = await question("Try again? (yes/no): ");
    if (retry.toLowerCase() === "yes" || retry.toLowerCase() === "y") {
      console.log("\n");
      await addDogPark(); // Retry
    } else {
      rl.close();
      process.exit(1);
    }
  }
}

// Run the script
console.log("🔥 Initializing Firebase connection...");
addDogPark();
