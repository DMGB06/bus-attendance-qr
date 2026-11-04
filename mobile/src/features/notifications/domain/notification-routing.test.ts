import { getNotificationChildId } from "@/src/features/notifications/domain/notification-routing";

const ID = "11111111-1111-4111-8111-111111111111";

describe("getNotificationChildId", () => {
  it("devuelve el alumno que trae la notificacion", () => {
    expect(getNotificationChildId({ student_id: ID })).toBe(ID);
  });

  it("ignora datos que no identifican a un alumno", () => {
    expect(getNotificationChildId({ student_id: "../otra-ruta" })).toBeNull();
    expect(getNotificationChildId({ student_id: 5 })).toBeNull();
    expect(getNotificationChildId({})).toBeNull();
    expect(getNotificationChildId(null)).toBeNull();
  });
});
