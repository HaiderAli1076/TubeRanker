import dotenv from "dotenv";
dotenv.config();

async function main() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const channelId = "UCuTaETSuCOip04vU1L11z0g"; // Google
  const url = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${channelId}&key=${apiKey}`;

  console.log("Calling YouTube API URL:", url.replace(apiKey || "", "HIDDEN_KEY"));
  try {
    const res = await fetch(url);
    console.log("Response Status:", res.status);
    const json = await res.json();
    console.log("Response JSON:", JSON.stringify(json, null, 2));
  } catch (error: any) {
    console.error("Fetch failed:", error.message);
  }
}

main();
