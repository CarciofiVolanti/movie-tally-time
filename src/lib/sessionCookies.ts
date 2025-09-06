import Cookies from "js-cookie";

export const getSelectedPersonForSession = (sessionId: string) => {
  return Cookies.get(`selectedPerson_${sessionId}`) || "";
};

export const setSelectedPersonForSession = (sessionId: string, personId: string) => {
  if (!personId) {
    Cookies.remove(`selectedPerson_${sessionId}`);
    return;
  }
  Cookies.set(`selectedPerson_${sessionId}`, personId, { expires: 30 });
};
