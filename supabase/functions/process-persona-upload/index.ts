import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { uploadResults, category = 'persona' } = await req.json()
    console.log('Processing uploaded files:', { uploadResults, category })

    const results = []

    for (const uploadResult of uploadResults) {
      try {
        // Fetch the file content from storage
        const response = await fetch(uploadResult.publicUrl)
        const content = await response.text()
        
        console.log(`Processing file: ${uploadResult.fileName}`)
        console.log(`Content preview: ${content.substring(0, 100)}...`)

        if (category === 'boss' || uploadResult.fileName.toLowerCase().includes('boss')) {
          // Process boss file - now stored in storage bucket, no database upsert needed
          console.log('✅ Boss profile processed and stored in boss bucket')
          results.push({ 
            fileName: uploadResult.fileName, 
            status: 'success', 
            type: 'boss',
            location: 'boss bucket'
          })
        } else {
          // Process persona file
          const personaName = extractPersonaName(uploadResult.fileName, content)
          
          if (!personaName) {
            results.push({ 
              fileName: uploadResult.fileName, 
              status: 'skipped', 
              reason: 'Could not determine persona name' 
            })
            continue
          }

          // Upsert persona - now stored in storage bucket, no database upsert needed
          console.log(`✅ Persona ${personaName} processed and stored in personas bucket`)
          results.push({ 
            fileName: uploadResult.fileName, 
            status: 'success', 
            type: 'persona',
            personaName,
            location: 'personas bucket'
          })
          }
        }
      } catch (error) {
        console.error(`Error processing file ${uploadResult.fileName}:`, error)
        results.push({ 
          fileName: uploadResult.fileName, 
          status: 'error', 
          error: error.message 
        })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Files processed successfully',
        results 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in process-persona-upload:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

function extractPersonaName(fileName: string, content: string): string | null {
  // Try to extract from filename first
  const fileBaseName = fileName.replace(/\.md$/i, '').replace(/^.*\//, '')
  
  // Known persona names
  const knownPersonas = ['gunnar', 'kirby', 'samara', 'stefan']
  const lowerFileName = fileBaseName.toLowerCase()
  
  for (const persona of knownPersonas) {
    if (lowerFileName.includes(persona)) {
      return persona.charAt(0).toUpperCase() + persona.slice(1)
    }
  }
  
  // Try to extract from content (look for ### PersonaName or # PersonaName patterns)
  const nameMatch = content.match(/###?\s*([A-Z][a-zA-Z]+)\s*[-–]\s*/)
  if (nameMatch) {
    return nameMatch[1]
  }
  
  return null
}

function extractNameFromContent(content: string): string | null {
  // Look for title patterns like "# **Boss – Founder and CEO of Oovar**"
  const titleMatch = content.match(/^#\s*\*?\*?([^*\n]+)\*?\*?/m)
  if (titleMatch) {
    return titleMatch[1].trim()
  }
  
  return null
}