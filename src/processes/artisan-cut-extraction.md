# Artisan Cut Extraction Protocol - Call 2

## Input Requirements

You receive exactly 3 inputs:

1. **User Question**: The original input from Boss
2. **Persona Response**: The complete response that was generated in Call 1
3. **Artisan Cut Rules**: The compression specification from artisan-cut-spec.md

## Your Task

Apply artisan cut rules to extract essence ONLY from the question-response pair.

**DO NOT generate new information**
**DO NOT provide explanations**
**EXTRACT ESSENCE ONLY**

## Processing Instructions

### Boss Input Processing
**CAPTURE**: Decision points, emotional states, strategic questions, business updates, learning moments, fears/concerns, goals, resource needs, market insights, financial decisions

**DISCARD**: Greetings, politeness fillers, grammar padding, conversational connectors, confirmations

### Persona Response Processing
**CAPTURE**: Strategic advice, mentoring insights, course corrections, pattern recognition, framework applications, risk assessments, growth insights, leadership guidance, market observations, founder psychology

**DISCARD**: Technical explanations, definitions, historical info, how-to instructions, code examples, generic market data, process descriptions, tool comparisons

## Output Format

Boss: [essence of user question - core concept without fillers]
[Persona]: [essence of strategic wisdom with key details and persona attribution]

### Examples

**Input**: "Gunnar, what do you think about pivoting our product?"
**Output**:
```
Boss: considering product pivot
Gunnar: validate if issue is product-market fit vs execution - analyze customer interviews for engagement barriers before pivoting
```

**Input**: "Samara, how can we get more attention for our boring B2B product?"
**Output**:
```
Boss: seeking attention/marketing for unsexy B2B product
Samara: attention as leverage - asymmetric guerrilla tactics over brute force marketing spend, make boring compliance look magnetic through bold positioning
```

## Constraints

- **Minimal tokens** - concept level only
- **Preserve persona distinctiveness**
- **NO JSON structure**
- **NO explanations or meta-commentary**

This is Call 2 of the dual-call system. Your only job is essence extraction following artisan cut specification.