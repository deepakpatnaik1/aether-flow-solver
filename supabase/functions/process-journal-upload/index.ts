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

    const { uploadResults, directContent } = await req.json()
    console.log('Processing journal files:', { uploadResults: !!uploadResults, directContent: !!directContent })

    const results = []

    // Handle direct content (for files already in user-uploads://)
    if (directContent && Array.isArray(directContent)) {
      for (const item of directContent) {
        try {
          const { filename, content } = item
          console.log(`Processing direct content: ${filename}`)
          
          const result = await processJournalContent(supabase, filename, content)
          results.push(result)
        } catch (error) {
          console.error(`Error processing direct content ${item.filename}:`, error)
          results.push({ 
            fileName: item.filename, 
            status: 'error', 
            error: error.message 
          })
        }
      }
    }

    // Handle uploaded files
    if (uploadResults && Array.isArray(uploadResults)) {
      for (const uploadResult of uploadResults) {
        try {
          // Fetch the file content from storage
          const response = await fetch(uploadResult.publicUrl)
          const content = await response.text()
          
          console.log(`Processing uploaded file: ${uploadResult.fileName}`)
          
          const result = await processJournalContent(supabase, uploadResult.fileName, content)
          results.push(result)
        } catch (error) {
          console.error(`Error processing uploaded file ${uploadResult.fileName}:`, error)
          results.push({ 
            fileName: uploadResult.fileName, 
            status: 'error', 
            error: error.message 
          })
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Journal files processed successfully',
        results 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error in process-journal-upload:', error)
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

async function processJournalContent(supabase: any, fileName: string, content: string) {
  const title = extractTitle(fileName, content)
  const entryType = determineEntryType(fileName, content)
  const tags = extractTags(fileName, content)
  
  console.log(`Processing: ${fileName} -> ${title} (${entryType})`)
  
  // Upsert knowledge entry (update if exists, insert if not)
  const { data, error } = await supabase
    .from('knowledge_entries')
    .upsert({ 
      title,
      content: content.trim(),
      entry_type: entryType,
      tags,
      source_file: fileName
    })
    .select()

  if (error) {
    console.error(`Error upserting knowledge entry for ${fileName}:`, error)
    return { 
      fileName, 
      status: 'error', 
      error: error.message 
    }
  }

  console.log(`✅ Knowledge entry processed: ${title}`)
  return { 
    fileName, 
    status: 'success', 
    title,
    entryType,
    tags,
    data 
  }
}

function extractTitle(fileName: string, content: string): string {
  // Try to extract title from filename first
  const baseName = fileName.replace(/\.md$/i, '').replace(/^.*\//, '')
  
  // If it's a journal doc, extract number
  const journalMatch = baseName.match(/journal_Doc_(\d+)/i)
  if (journalMatch) {
    // Look for key topics in content to create meaningful title
    const lines = content.split('\n').slice(0, 10) // First 10 lines
    const contentPreview = lines.join(' ').toLowerCase()
    
    if (contentPreview.includes('sprint') || contentPreview.includes('august') || contentPreview.includes('september')) {
      return `Sprint Planning & Milestones (Journal ${journalMatch[1]})`
    }
    if (contentPreview.includes('eit') || contentPreview.includes('consortium') || contentPreview.includes('strategic innovation')) {
      return `EIT Urban Mobility & Consortium Strategy (Journal ${journalMatch[1]})`
    }
    if (contentPreview.includes('exit') || contentPreview.includes('€100m') || contentPreview.includes('equity')) {
      return `Exit Strategy & Equity Planning (Journal ${journalMatch[1]})`
    }
    if (contentPreview.includes('gunnar') || contentPreview.includes('kirby') || contentPreview.includes('personas')) {
      return `Team Introduction & Personas (Journal ${journalMatch[1]})`
    }
    if (contentPreview.includes('uvar') || contentPreview.includes('compliance') || contentPreview.includes('market')) {
      return `UVAR Market Analysis & Strategy (Journal ${journalMatch[1]})`
    }
    if (contentPreview.includes('experience') || contentPreview.includes('here technologies') || contentPreview.includes('founder')) {
      return `Founder Background & Experience (Journal ${journalMatch[1]})`
    }
    
    return `Founder Journey Entry ${journalMatch[1]}`
  }
  
  // Look for title patterns in content
  const titleMatch = content.match(/^#+\s*(.+)$/m)
  if (titleMatch) {
    return titleMatch[1].trim()
  }
  
  // Default to cleaned filename
  return baseName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function determineEntryType(fileName: string, content: string): string {
  const lowerContent = content.toLowerCase()
  const lowerFileName = fileName.toLowerCase()
  
  if (lowerContent.includes('sprint') || lowerContent.includes('milestone')) {
    return 'planning'
  }
  if (lowerContent.includes('decision') || lowerContent.includes('committed to')) {
    return 'decision'
  }
  if (lowerContent.includes('gunnar:') || lowerContent.includes('kirby:') || lowerContent.includes('boss:')) {
    return 'conversation'
  }
  if (lowerContent.includes('experience') || lowerContent.includes('background') || lowerContent.includes('education')) {
    return 'background'
  }
  if (lowerContent.includes('strategy') || lowerContent.includes('analysis')) {
    return 'strategy'
  }
  
  return 'journal'
}

function extractTags(fileName: string, content: string): string[] {
  const tags = []
  const lowerContent = content.toLowerCase()
  
  // Topic tags
  if (lowerContent.includes('uvar') || lowerContent.includes('urban vehicle access')) {
    tags.push('uvar')
  }
  if (lowerContent.includes('oovar')) {
    tags.push('oovar')
  }
  if (lowerContent.includes('eit') || lowerContent.includes('consortium')) {
    tags.push('eit-funding')
  }
  if (lowerContent.includes('exit') || lowerContent.includes('€100m')) {
    tags.push('exit-strategy')
  }
  if (lowerContent.includes('equity') || lowerContent.includes('dilution')) {
    tags.push('equity')
  }
  if (lowerContent.includes('cofounder') || lowerContent.includes('sales')) {
    tags.push('team-building')
  }
  if (lowerContent.includes('sprint') || lowerContent.includes('milestone')) {
    tags.push('planning')
  }
  if (lowerContent.includes('berlin') || lowerContent.includes('pilot')) {
    tags.push('berlin-pilot')
  }
  if (lowerContent.includes('here technologies')) {
    tags.push('here-experience')
  }
  if (lowerContent.includes('compliance') || lowerContent.includes('regulation')) {
    tags.push('compliance')
  }
  
  // Persona tags
  if (lowerContent.includes('gunnar')) tags.push('gunnar')
  if (lowerContent.includes('kirby')) tags.push('kirby')
  if (lowerContent.includes('samara')) tags.push('samara')
  if (lowerContent.includes('stefan')) tags.push('stefan')
  
  return tags
}