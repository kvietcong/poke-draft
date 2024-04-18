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
