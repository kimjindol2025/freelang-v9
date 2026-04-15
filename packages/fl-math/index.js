"use strict";
// FreeLang v9 Package: fl-math
// 수학 유틸리티 패키지
Object.defineProperty(exports, "__esModule", { value: true });
exports.flMathFunctions = void 0;
exports.registerFlMath = registerFlMath;
exports.flMathFunctions = {
    // 기초 함수
    "math:abs": (x) => Math.abs(x),
    "math:floor": (x) => Math.floor(x),
    "math:ceil": (x) => Math.ceil(x),
    "math:round": (x) => Math.round(x),
    "math:sqrt": (x) => Math.sqrt(x),
    "math:pow": (x, y) => Math.pow(x, y),
    "math:log": (x) => Math.log(x),
    "math:log2": (x) => Math.log2(x),
    "math:log10": (x) => Math.log10(x),
    // 삼각함수
    "math:sin": (x) => Math.sin(x),
    "math:cos": (x) => Math.cos(x),
    "math:tan": (x) => Math.tan(x),
    "math:asin": (x) => Math.asin(x),
    "math:acos": (x) => Math.acos(x),
    "math:atan": (x) => Math.atan(x),
    "math:atan2": (y, x) => Math.atan2(y, x),
    // 통계
    "math:mean": (arr) => arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length,
    "math:sum": (arr) => arr.reduce((a, b) => a + b, 0),
    "math:max": (arr) => arr.length === 0 ? -Infinity : Math.max(...arr),
    "math:min": (arr) => arr.length === 0 ? Infinity : Math.min(...arr),
    "math:median": (arr) => {
        if (arr.length === 0)
            return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];
    },
    "math:variance": (arr) => {
        if (arr.length === 0)
            return 0;
        const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
        return (arr.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / arr.length);
    },
    "math:stddev": (arr) => {
        const variance = arr.length === 0
            ? 0
            : (() => {
                const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
                return (arr.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) /
                    arr.length);
            })();
        return Math.sqrt(variance);
    },
    // 정수 관련
    "math:gcd": (a, b) => {
        a = Math.abs(Math.floor(a));
        b = Math.abs(Math.floor(b));
        while (b !== 0) {
            [a, b] = [b, a % b];
        }
        return a;
    },
    "math:lcm": (a, b) => {
        const g = Math.abs(Math.floor(a));
        const h = Math.abs(Math.floor(b));
        if (g === 0 || h === 0)
            return 0;
        const gcd = (() => {
            let x = g;
            let y = h;
            while (y !== 0)
                [x, y] = [y, x % y];
            return x;
        })();
        return (g / gcd) * h;
    },
    "math:clamp": (x, lo, hi) => Math.min(hi, Math.max(lo, x)),
    "math:lerp": (a, b, t) => a + (b - a) * t,
    // 상수
    "math:pi": Math.PI,
    "math:e": Math.E,
    "math:tau": Math.PI * 2,
    "math:phi": (1 + Math.sqrt(5)) / 2,
};
function registerFlMath(registry) {
    for (const [name, fn] of Object.entries(exports.flMathFunctions)) {
        registry[name] = fn;
    }
}
//# sourceMappingURL=index.js.map