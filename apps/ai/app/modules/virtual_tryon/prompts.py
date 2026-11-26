"""
Prompts for AI Virtual Try-On using gpt-image-2.6-sunburst.
Focuses on strict identity preservation, accurate garment drape, and cultural authenticity.
"""

def build_tryon_prompt(
    costume_name: str,
    costume_keywords: str | None = None,
    gender: str | None = "unisex",
    destination_backdrop: str | None = None,
    preserve_background: bool = True
) -> str:
    """
    Constructs a high-precision prompt for gpt-image-2.6-sunburst virtual costume try-on.
    """
    gender_spec = f"for a {gender} subject" if gender and gender != "unisex" else "for the subject"
    
    costume_details = costume_name
    if costume_keywords:
        costume_details += f" ({costume_keywords})"

    backdrop_instruction = (
        "Preserve the original background and surroundings from the source photo."
        if preserve_background or not destination_backdrop
        else f"Place the subject seamlessly in the scenic travel setting of {destination_backdrop}, with matching atmospheric natural lighting and realistic depth of field."
    )

    prompt = (
        f"Professional hyper-realistic photograph: Virtual Try-On of Vietnamese/regional local attire.\n"
        f"Subject modification:\n"
        f"1. Replace the person's existing clothing entirely with authentic {costume_details} {gender_spec}.\n"
        f"2. Strict Facial & Identity Preservation: Keep the person's facial features, eyes, nose, mouth, expressions, skin tone, hairstyle, and body proportions completely identical to the source image.\n"
        f"3. Garment Fidelity & Fit: The garment must naturally wrap and fit the subject's pose, shoulders, and posture with realistic fabric texture, intricate embroidery, natural wrinkles, and believable folds.\n"
        f"4. Environment & Lighting: {backdrop_instruction}\n"
        f"5. Quality: Ultra high resolution, 8k photographic detail, master portrait lighting, no distortions, no uncanny artifacts."
    )
    return prompt.strip()
