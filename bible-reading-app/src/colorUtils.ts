// src/colorUtils.ts

const FNV1_32_INIT = 0x811c9dc5;

function fnv1a(str: string): number {
    let hash = FNV1_32_INIT;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return hash >>> 0;
}

export function generateColorFromString(str: string): string {
    const hash = fnv1a(str);
    const r = (hash & 0xFF0000) >> 16;
    const g = (hash & 0x00FF00) >> 8;
    const b = hash & 0x0000FF;
    return `rgb(${r}, ${g}, ${b})`;
}
