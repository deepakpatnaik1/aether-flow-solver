import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getBerlinTimeISO, getBerlinTime } from '@/lib/timezone';

interface Message {
  id: string;
  content: string;
  persona: string;
  timestamp: Date;
  isUser?: boolean;
  attachments?: {
    fileName: string;
    publicUrl: string;
    originalName: string;
    size: number;
    type: string;
  }[];
}

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [journal, setJournal] = useState<Array<{persona: string, content: string}>>([]);

  // Load superjournal and journal entries on startup
  useEffect(() => {
    loadSuperjournalFromSupabase();
    loadJournalFromSupabase();
    
    // Add mock messages for testing when no auth (temporary)
    setTimeout(() => {
      setMessages(prev => {
        if (prev.length === 0) {
          return [
            {
              id: 'astro-1',
              content: `# What is a black hole?

A **black hole** is a region in space where gravity is so strong that nothing—not even light—can escape once it crosses the event horizon.

## Key Properties:
- **Event Horizon**: The "point of no return"
- **Singularity**: The center where density becomes infinite
- **Accretion Disk**: Hot material spiraling into the black hole

### Formation Process:
1. Massive star (>25 solar masses) runs out of fuel
2. Core collapses in milliseconds
3. \`if (mass > 3 * sun_mass) { form_black_hole(); }\`

> "Black holes are not cosmic vacuum cleaners" - Neil deGrasse Tyson`,
              persona: 'Stefan',
              timestamp: new Date(Date.now() - 15000),
              isUser: false
            },
            {
              id: 'astro-2',
              content: `**Question**: How do we detect exoplanets?

There are several methods astronomers use:

### Transit Method
- [x] Most successful technique
- [x] Observes dimming when planet crosses star
- [ ] Can detect atmospheric composition (advanced)

### Radial Velocity
The star "wobbles" due to gravitational pull:

\`\`\`python
def detect_wobble(star_velocity):
    if abs(velocity_change) > threshold:
        return "Possible planet detected"
    return "No planet detected"
\`\`\`

**Famous discoveries:**
• Proxima Centauri b (2016)
• TRAPPIST-1 system (7 planets!)
• Kepler-452b ("Earth's cousin")`,
              persona: 'Samara',
              timestamp: new Date(Date.now() - 12000),
              isUser: false
            },
            {
              id: 'astro-3',
              content: `How far is the nearest star?

**Proxima Centauri** is our closest stellar neighbor at **4.24 light-years** away.

To put this in perspective:
- Distance: ~25 trillion miles (40 trillion km)
- Travel time at light speed: 4.24 years
- Current fastest spacecraft: ~73,000 years

## Measurement Technique: Parallax
\`\`\`
parallax_angle = observe_star_position()
distance = 1 / parallax_angle  # in parsecs
\`\`\`

Fun fact: If Earth were the size of a marble, Proxima Centauri would be about 2,500 miles away! 🌟`,
              persona: 'Kirby',
              timestamp: new Date(Date.now() - 9000),
              isUser: true
            },
            {
              id: 'astro-4',
              content: `# The Life Cycle of Stars ⭐

Stars go through predictable phases based on their mass:

## Low Mass Stars (like our Sun):
1. **Main Sequence** (10 billion years)
2. **Red Giant** (helium burning)
3. **White Dwarf** (cooling remnant)

## High Mass Stars:
1. Main Sequence (millions of years)
2. Supergiant phases
3. **Supernova explosion** 💥
4. Neutron Star or Black Hole

### Nuclear Fusion Equations:
\`\`\`
4¹H → ⁴He + 2e⁺ + 2νₑ + energy
^12C + ^4He → ^16O + γ
\`\`\`

**Checklist for stellar death:**
- [ ] Hydrogen exhausted in core
- [x] Helium fusion begins
- [x] Carbon/oxygen burning (if massive enough)
- [ ] Iron core formation (death sentence)`,
              persona: 'Gunnar',
              timestamp: new Date(Date.now() - 6000),
              isUser: false
            },
            {
              id: 'astro-5',
              content: `What causes the northern lights?

**Aurora Borealis** results from solar particles interacting with Earth's magnetosphere.

### The Process:
1. **Solar wind** carries charged particles
2. Earth's **magnetic field** deflects most particles
3. Some particles enter at the poles
4. Collide with atmospheric gases:
   - *Oxygen*: Green (557.7 nm) and red (630.0 nm)
   - *Nitrogen*: Blue and purple

\`\`\`javascript
function createAurora(solarWind, magneticField) {
  const particles = magneticField.deflect(solarWind);
  const polar_entry = particles.filter(p => p.latitude > 60);
  return polar_entry.map(p => p.collideWith(atmosphere));
}
\`\`\`

> The same phenomenon occurs on other planets with magnetic fields, including Jupiter and Saturn! 🪐`,
              persona: 'Stefan',
              timestamp: new Date(Date.now() - 3000),
              isUser: false
            },
            {
              id: 'astro-6',
              content: `# Dark Matter vs Dark Energy 🌌

These are two of astronomy's biggest mysteries:

## Dark Matter (27% of universe)
- **Observable effects:**
  • Galaxy rotation curves don't match visible matter
  • Gravitational lensing of distant galaxies  
  • Large-scale structure formation

- **Properties:**
  - [x] Interacts gravitationally
  - [x] Doesn't emit light
  - [ ] Interacts electromagnetically
  - [ ] Well understood (yet!)

## Dark Energy (68% of universe)
Causes accelerating expansion of the universe.

### Evidence:
\`\`\`
Type Ia supernovae observations:
distance = apparent_brightness / absolute_brightness
redshift = (observed_wavelength - rest_wavelength) / rest_wavelength

Result: More distant = faster recession (accelerating!)
\`\`\`

**What we know:** It's there and it's dominant
**What we don't know:** What it actually is! 🤷‍♂️`,
              persona: 'Samara',
              timestamp: new Date(Date.now() - 1000),
              isUser: true
            }
          ];
        }
        return prev;
      });
    }, 1000);
  }, []);

  const loadSuperjournalFromSupabase = async () => {
    try {
      console.log('📖 Loading superjournal from Supabase DB...');
      
      const { data: entries, error } = await supabase
        .from('superjournal_entries')
        .select('*')
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('❌ Error loading superjournal:', error);
        return;
      }

      console.log(`✅ Loaded ${entries?.length || 0} entries from superjournal`);
      
      if (entries && entries.length > 0) {
        console.log('🔍 First entry:', entries[0]);
        
        // Convert superjournal entries to messages format
        const superjournalMessages: Message[] = [];
        
        entries.forEach((entry, index) => {
          console.log(`🔄 Processing entry ${index + 1}:`, {
            id: entry.entry_id,
            userContent: entry.user_message_content?.substring(0, 50),
            aiContent: entry.ai_response_content?.substring(0, 50)
          });
          
          // Add user message
          superjournalMessages.push({
            id: entry.entry_id + '-user',
            content: entry.user_message_content,
            persona: entry.user_message_persona,
            timestamp: new Date(entry.timestamp),
            isUser: true,
            attachments: Array.isArray(entry.user_message_attachments) ? entry.user_message_attachments as Array<{
              fileName: string;
              publicUrl: string;
              originalName: string;
              size: number;
              type: string;
            }> : []
          });
          
          // Add AI response
          superjournalMessages.push({
            id: entry.entry_id + '-ai',
            content: entry.ai_response_content,
            persona: entry.ai_response_persona,
            timestamp: new Date(new Date(entry.timestamp).getTime() + 1000), // Add 1 second
            isUser: false
          });
        });
        
        console.log(`🎯 Created ${superjournalMessages.length} messages from ${entries.length} entries`);
        
        // Set messages from superjournal only if no messages exist yet
        setMessages(prev => {
          if (prev.length === 0) {
            console.log('📥 Loading', superjournalMessages.length, 'messages from superjournal');
            return superjournalMessages;
          } else {
            console.log('⚠️ Skipping superjournal load - messages already exist:', prev.length);
            return prev;
          }
        });
      }
      
    } catch (error) {
      console.error('❌ Error loading superjournal:', error);
    }
  };

  const loadJournalFromSupabase = async () => {
    try {
      console.log('📖 Loading journal entries from Supabase DB...');
      
      const { data: entries, error } = await supabase
        .from('journal_entries')
        .select('*')
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('❌ Error loading journal entries:', error);
        return;
      }

      console.log(`✅ Loaded ${entries?.length || 0} journal entries`);
      
      if (entries && entries.length > 0) {
        const journalEntries = entries.map(entry => ({
          persona: entry.ai_response_persona,
          content: entry.ai_response_content
        }));
        
        setJournal(journalEntries);
        console.log('📥 Loaded', journalEntries.length, 'journal entries');
      }
      
    } catch (error) {
      console.error('❌ Error loading journal entries:', error);
    }
  };

  const saveToJournal = async (userMessage: Message, aiMessage: Message, model: string, turnId?: string) => {
    // NOTE: This function is now deprecated in favor of Call 2 (artisan-cut-extraction)
    // Journal entries are now populated by the artisan cut extraction process
    // This function is kept for backward compatibility but should not be used in normal flow
    console.log('⚠️ saveToJournal called - should be handled by Call 2 instead');
    return true;
  };

  const saveToSuperjournal = async (userMessage: Message, aiMessage: Message, model: string, turnId?: string) => {
    console.log('🚀 saveToSuperjournal called with:', {
      userContent: userMessage.content.substring(0, 50),
      aiContent: aiMessage.content.substring(0, 50),
      model,
      turnId
    });
    
    try {
      const entryId = turnId || crypto.randomUUID();
      const timestamp = getBerlinTimeISO();

      console.log('💾 About to save to superjournal DB:', {
        id: entryId,
        userContentLength: userMessage.content.length,
        aiContentLength: aiMessage.content.length
      });
      
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('superjournal_entries')
        .insert({
          entry_id: entryId,
          timestamp: timestamp,
          user_id: user?.id,
          user_message_content: userMessage.content,
          user_message_persona: userMessage.persona,
          user_message_attachments: userMessage.attachments || [],
          ai_response_content: aiMessage.content,
          ai_response_persona: aiMessage.persona,
          ai_response_model: model
        });

      if (error) {
        console.error('❌ Failed to save to superjournal:', error);
        return false;
      }

      console.log('✅ Conversation turn saved to superjournal DB');
      
      // Trigger Call 2 (Artisan Cut Extraction) in background - don't await
      triggerArtisanCutExtraction(userMessage, aiMessage, model, entryId);
      
      return true;
      
    } catch (error) {
      console.error('❌ Superjournal save error:', error);
      return false;
    }
  };

  const triggerArtisanCutExtraction = async (userMessage: Message, aiMessage: Message, model: string, entryId: string) => {
    try {
      console.log('🔍 Triggering Call 2 - Artisan Cut Extraction for:', entryId);
      
      const { error } = await supabase.functions.invoke('artisan-cut-extraction', {
        body: {
          userQuestion: userMessage.content,
          personaResponse: aiMessage.content,
          entryId,
          userPersona: userMessage.persona,
          aiPersona: aiMessage.persona,
          model
        }
      });

      if (error) {
        console.error('❌ Call 2 failed:', error);
      } else {
        console.log('✅ Call 2 triggered successfully for:', entryId);
      }
    } catch (error) {
      console.error('❌ Error triggering Call 2:', error);
    }
  };

  return {
    messages,
    journal,
    setMessages,
    setJournal,
    saveToSuperjournal,
    saveToJournal,
  };
};