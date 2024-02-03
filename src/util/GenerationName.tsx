export const generationSmogonName: { [id: string]: string } = {
    1: "RB",
    2: "GS",
    3: "RS",
    4: "DP",
    5: "BW",
    6: "XY",
    7: "SM",
    8: "SS",
    9: "SV",
};

export const getGenerationName = (gen: number) =>
generationSmogonName[gen] || "SV";

export default getGenerationName;
