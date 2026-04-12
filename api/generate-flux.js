// api/generate-flux.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
    if (!REPLICATE_API_TOKEN) {
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        // Step 1: Create prediction
        const createRes = await fetch("https://api.replicate.com/v1/predictions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${REPLICATE_API_TOKEN}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                version: "black-forest-labs/flux-schnell",
                input: {
                    prompt: prompt + ", realistic fashion photography, detailed fabric texture, accurate clothing drape, natural lighting, photorealistic, 8k",
                    aspect_ratio: "3:4",
                    output_quality: 95,
                    num_outputs: 1
                }
            })
        });

        const prediction = await createRes.json();
        const predictionId = prediction.id;

        // Step 2: Polling sampai selesai
        let imageUrl = null;
        for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 1800));

            const statusRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
                headers: { "Authorization": `Bearer ${REPLICATE_API_TOKEN}` }
            });
            const status = await statusRes.json();

            if (status.status === "succeeded") {
                imageUrl = status.output[0];
                break;
            }
            if (status.status === "failed") {
                throw new Error(status.error || "Generation failed");
            }
        }

        if (!imageUrl) throw new Error("Timeout");

        return res.status(200).json({ success: true, imageUrl });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message || "Failed to generate image" });
    }
}
