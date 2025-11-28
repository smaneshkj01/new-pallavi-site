/**
 * Cloudflare Worker for New Pallavi Boat Club R2 Image Uploader
 * 
 * This worker handles:
 * - POST /upload - Upload images to R2 bucket
 * 
 * Required R2 Bucket Binding: IMAGES_BUCKET
 */

// CORS headers for cross-origin requests
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
    async fetch(request, env) {
        // Handle CORS preflight requests
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: corsHeaders
            });
        }

        try {
            // POST /upload - Upload image to R2
            if (request.method === 'POST') {
                return await handleUpload(request, env);
            }

            return new Response('Method Not Allowed', {
                status: 405,
                headers: corsHeaders
            });

        } catch (error) {
            console.error('Worker error:', error);
            return new Response(JSON.stringify({
                error: 'Internal Server Error',
                message: error.message
            }), {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
        }
    }
};

/**
 * Handle POST /upload
 * Uploads an image to R2 and returns the public URL
 */
async function handleUpload(request, env) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            return new Response(JSON.stringify({
                error: 'Bad Request',
                message: 'No file provided'
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const randomId = crypto.randomUUID();
        const extension = file.name.split('.').pop();
        const filename = `${timestamp}-${randomId}.${extension}`;

        // Upload to R2
        const arrayBuffer = await file.arrayBuffer();
        await env.IMAGES_BUCKET.put(filename, arrayBuffer, {
            httpMetadata: {
                contentType: file.type,
            }
        });

        // Construct public URL
        // Note: You'll need to set up a custom domain for your R2 bucket
        // or use the default R2.dev domain
        const publicUrl = `https://pub-YOUR-R2-BUCKET-ID.r2.dev/${filename}`;

        console.log(`Successfully uploaded: ${filename}`);

        return new Response(JSON.stringify({
            success: true,
            url: publicUrl,
            filename: filename,
            timestamp: new Date().toISOString()
        }), {
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });

    } catch (error) {
        console.error('Error uploading file:', error);

        return new Response(JSON.stringify({
            error: 'Internal Server Error',
            message: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
    }
}
