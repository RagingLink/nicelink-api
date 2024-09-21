import { parentPort } from 'worker_threads';

type ColourArray = [number, number, number];

interface ReplaceData {
    rgbBuffer: Buffer;
    labBuffer: Buffer;
    targetLab: ColourArray;
    replaceWithRgb: ColourArray;
    deltaE?: number;
    channels?: number;
}
function getDeltaE(x1: ColourArray, x2: ColourArray): number {
    // Delta L Prime
    const delta_l_prime = x2[0] - x1[0];

    // L Bar
    const l_bar = (x1[0] + x2[0]) / 2;

    // C1 & C2
    const c1 = Math.sqrt(Math.pow(x1[1], 2) + Math.pow(x1[2], 2));
    const c2 = Math.sqrt(Math.pow(x2[1], 2) + Math.pow(x2[2], 2));

    // C Bar
    const c_bar = (c1 + c2) / 2;

    // A Prime 1
    const a1_prime = x1[1] +
        x1[1] / 2 *
        (1 - Math.sqrt(
            Math.pow(c_bar, 7) /
            (Math.pow(c_bar, 7) + Math.pow(25, 7))
        ));

    // A Prime 2
    const a2_prime = x2[1] +
        x2[1] / 2 *
        (1 - Math.sqrt(
            Math.pow(c_bar, 7) /
            (Math.pow(c_bar, 7) + Math.pow(25, 7))
        ));

    // C Prime 1
    const c1_prime = Math.sqrt(
        Math.pow(a1_prime, 2) +
        Math.pow(x1[2], 2)
    );

    // C Prime 2
    const c2_prime = Math.sqrt(
        Math.pow(a2_prime, 2) +
        Math.pow(x2[2], 2)
    );

    // C Bar Prime
    const c_bar_prime = (c1_prime + c2_prime) / 2;

    // Delta C Prime
    const delta_c_prime = c2_prime - c1_prime;

    // S sub L
    const s_subl = 1 +
        0.015 * Math.pow(l_bar - 50, 2) /
        Math.sqrt(20 + Math.pow(l_bar - 50, 2))
        ;

    // S sub C
    const s_subc = 1 + 0.045 * c_bar_prime;

    // h Prime 1
    const h1_prime = gethPrime(x1[2], a1_prime);

    // h Prime 2
    const h2_prime = gethPrime(x2[2], a2_prime);

    // Delta H Prime
    const delta_h_prime = 2 * Math.sqrt(c1_prime * c2_prime) * Math.sin(degreesToRadians(getDeltahPrime(c1, c2, h1_prime, h2_prime)) / 2);

    // H Bar Prime
    const h_bar_prime = getHBarPrime(h1_prime, h2_prime);

    // T
    const T = getT(h_bar_prime);

    // S sub H
    const s_subh = 1 + 0.015 * c_bar_prime * T;

    // R sub T
    const r_subt = getRSubT(c_bar_prime, h_bar_prime);

    // Put it all together!
    const lightness = delta_l_prime / (1 * s_subl);
    const chroma = delta_c_prime / (1 * s_subc);
    const hue = delta_h_prime / (1 * s_subh);

    return Math.sqrt(
        Math.pow(lightness, 2) +
        Math.pow(chroma, 2) +
        Math.pow(hue, 2) +
        r_subt * chroma * hue
    );
}
/**
* Returns the RT variable calculation.
* @method
* @returns {number}
*/
function getRSubT(c_bar_prime: number, h_bar_prime: number): number {

    return -2 *
        Math.sqrt(
            Math.pow(c_bar_prime, 7) /
            (Math.pow(c_bar_prime, 7) + Math.pow(25, 7))
        ) *
        Math.sin(degreesToRadians(
            60 *
            Math.exp(
                -
                Math.pow(
                    (h_bar_prime - 275) / 25, 2
                )

            )
        ));
}
/**
* Returns the T variable calculation.
* @method
* @returns {number}
*/
function getT(h_bar_prime: number): number {
    return 1 -
        0.17 * Math.cos(degreesToRadians(h_bar_prime - 30)) +
        0.24 * Math.cos(degreesToRadians(2 * h_bar_prime)) +
        0.32 * Math.cos(degreesToRadians(3 * h_bar_prime + 6)) -
        0.20 * Math.cos(degreesToRadians(4 * h_bar_prime - 63));
}
/**
* Returns the H Bar Prime variable calculation.
* @method
* @returns {number}
*/
function getHBarPrime(h1_prime: number, h2_prime: number): number {

    if (Math.abs(h1_prime - h2_prime) > 180) {
        return (h1_prime + h2_prime + 360) / 2;
    }

    return (h1_prime + h2_prime) / 2;
}
/**
* Returns the Delta h Prime variable calculation.
* @method
* @returns {number}
*/
function getDeltahPrime(c1: number, c2: number, h1_prime: number, h2_prime: number): number {
    // When either C′1 or C′2 is zero, then Δh′ is irrelevant and may be set to
    // zero.
    if (0 === c1 || 0 === c2) {
        return 0;
    }

    if (Math.abs(h1_prime - h2_prime) <= 180) {
        return h2_prime - h1_prime;
    }

    if (h2_prime <= h1_prime) {
        return h2_prime - h1_prime + 360;
    }
    return h2_prime - h1_prime - 360;

}
/**
* A helper function to calculate the h Prime 1 and h Prime 2 values.
* @method
* @private
* @returns {number}
*/
function gethPrime(x: number, y: number): number {
    if (x === 0 && y === 0) {
        return 0;
    }

    const hueAngle = radiansToDegrees(Math.atan2(x, y));

    if (hueAngle >= 0) {
        return hueAngle;
    }
    return hueAngle + 360;

}
/**
* Gives the radian equivalent of a specified degree angle.
* @method
* @returns {number}
*/
function radiansToDegrees(radians: number): number {
    return radians * (180 / Math.PI);
}
/**
* Gives the degree equivalent of a specified radian.
* @method
* @returns {number}
*/
function degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}

function replaceRGB({ rgbBuffer, labBuffer, targetLab, replaceWithRgb, deltaE = 2.3, channels = 4 }: ReplaceData): Buffer {
    for (let i = 0; i < labBuffer.length / channels; i++) {
        if (getDeltaE([labBuffer[i * channels], labBuffer[i * channels + 1], labBuffer[i * channels + 2]], targetLab) <= deltaE) {
            rgbBuffer[i * channels] = replaceWithRgb[0];
            rgbBuffer[i * channels + 1] = replaceWithRgb[1];
            rgbBuffer[i * channels + 2] = replaceWithRgb[2];
        }
    }
    return rgbBuffer;
}

parentPort?.on('message', (data: ReplaceData) => {
    parentPort?.postMessage(replaceRGB(data));
});
