import { useEffect, useRef, useState } from "react";

// Keep cursor history in the URL so refresh and return from detail preserve the page.
export function useListNavigation() {
  const [search, setSearch] = useState(window.location.search);
  const params = new URLSearchParams(search);
  const cursor = params.get("cursor") ?? "";
  const previous = params.getAll("before");
  useEffect(() => {
    const pop = () => setSearch(window.location.search);
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  function move(next: string, back = false) {
    const nextParams = new URLSearchParams();
    if (next) nextParams.set("cursor", next);
    for (const item of back ? previous.slice(0, -1) : [...previous, cursor])
      nextParams.append("before", item);
    const url = window.location.pathname + (nextParams.size ? "?" + nextParams : "");
    window.history.pushState(null, "", url);
    setSearch(window.location.search);
  }
  return { cursor, previous, move };
}

export function listReturnHref() {
  const params = new URLSearchParams(window.location.search);
  params.set("scroll", String(Math.round(window.scrollY)));
  return window.location.pathname + "?" + params;
}

export function imageDetailHref(id: string) {
  return "/app/images/" + encodeURIComponent(id) + "?returnTo=" + encodeURIComponent(listReturnHref());
}

export function imageBackHref(search: string) {
  const params = new URLSearchParams(search);
  const fallback = params.get("from") === "history" ? "/app/history" : "/app/library";
  const target = params.get("returnTo");
  if (!target) return fallback;
  // Accept only local list routes; never navigate to a supplied external origin.
  if (!/^\/app\/(library|history)(\?|$)/.test(target) || target.includes("#")) return fallback;
  return target;
}

export function useRestoreListScroll(loading: boolean) {
  const search = window.location.search;
  const restored = useRef<string | null>(null);
  useEffect(() => {
    if (loading || restored.current === search) return;
    const scroll = Number(new URLSearchParams(search).get("scroll") ?? 0);
    const frame = requestAnimationFrame(() => {
      restored.current = search;
      window.scrollTo({ top: Number.isFinite(scroll) ? Math.max(0, scroll) : 0, behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
  }, [search, loading]);
}
