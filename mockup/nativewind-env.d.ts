/// <reference types="nativewind/types" />

// Metro resolves `.css` through NativeWind; TypeScript needs to be told it is a
// side-effect-only module rather than a missing file.
declare module '*.css';
