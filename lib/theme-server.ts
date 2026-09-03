import "server-only";

import { cookies } from "next/headers";

import { THEME_COOKIE, type Theme } from "@/lib/theme";

export async function getTheme(): Promise<Theme> {
  const store = await cookies();
  const value = store.get(THEME_COOKIE)?.value;
  return value === "dark" ? "dark" : "light";
}

/**
 * Runs before first paint to apply the stored theme without a flash.
 * Values are only ever "light" or "dark"; the default is light.
 */
export function themeInitScript(): string {
  return `(function(){try{var c=document.cookie.split(";").find(function(x){return x.trim().indexOf("${THEME_COOKIE}=")===0});var v=c?c.split("=")[1].replace(/^ +| +$/g,""):"";if(v==="dark"){document.documentElement.classList.add("dark")}else{document.documentElement.classList.remove("dark")}}catch(e){}})();`;
}