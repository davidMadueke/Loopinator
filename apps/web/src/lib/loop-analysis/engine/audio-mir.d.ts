declare module "@audio/mir-chroma" {
  export default function chroma(
    data: Float32Array | Float64Array,
    options?: {
      fs?: number;
      method?: "pcp" | "nnls";
    },
  ): Float64Array;
}

declare module "@audio/mir-key" {
  export default function key(
    input:
      | Float32Array
      | Float64Array
      | number[]
      | Array<Float32Array | Float64Array | number[]>,
  ): {
    tonic: number;
    mode: "major" | "minor";
    label: string;
    confidence: number;
    scores: Array<{ label: string; score: number }>;
  };
}
