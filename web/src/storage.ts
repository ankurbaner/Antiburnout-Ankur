export const clearLegacyStorage = (store: Pick<Storage, "removeItem">): void => {
  for (const key of ["anti-burnout:config", "anti-burnout:state", "anti-burnout:intention", "anti-burnout:spot"]) {
    try { store.removeItem(key); } catch {}
  }
};
