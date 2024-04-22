const scrollableStyleRegex = /(auto|scroll)/;

const getStyle = (el: HTMLElement, prop: string) =>
    getComputedStyle(el, null).getPropertyValue(prop);

const getIsScrollable = (el: HTMLElement) =>
    scrollableStyleRegex.test(
        getStyle(el, "overflow") +
            getStyle(el, "overflow-y") +
            getStyle(el, "overflow-x")
    );

export const getFirstScrollableParent = (
    el: HTMLElement | null
): HTMLElement | null => {
    if (!el) return null;
    if (getIsScrollable(el)) return el;
    return getFirstScrollableParent(el.parentElement);
};

export const getLocalPreferenceKey = (key: string) => `poke-draft.${key}`;

export const getLocalPreference = (key: string) => {
    return localStorage.getItem(getLocalPreferenceKey(key));
};

export const setLocalPreference = (key: string, value: string) => {
    return localStorage.setItem(getLocalPreferenceKey(key), value);
};
