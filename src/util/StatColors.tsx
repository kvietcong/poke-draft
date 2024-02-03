export const colorByStat: { [id: string]: string } = {
    hp: "#FF0000",
    attack: "#F08030",
    defense: "#F8D030",
    "sp. attack": "#6890F0",
    "sp. defense": "#78C850",
    speed: "#F85888",
};

export const getStatColor = (type: string) =>
    colorByStat[type.toLowerCase()] || "#777";

export default getStatColor;
