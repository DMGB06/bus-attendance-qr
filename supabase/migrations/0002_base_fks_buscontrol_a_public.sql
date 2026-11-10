ALTER TABLE ONLY "buscontrol"."bus_attendance_records"
    ADD CONSTRAINT "bus_attendance_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."social_bus_escolar"("id");
ALTER TABLE ONLY "buscontrol"."bus_student_guardians"
    ADD CONSTRAINT "bus_student_guardians_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."social_bus_escolar"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "buscontrol"."notification_log"
    ADD CONSTRAINT "notification_log_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."social_bus_escolar"("id");
ALTER TABLE ONLY "buscontrol"."student_guardians"
    ADD CONSTRAINT "student_guardians_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."social_bus_escolar"("id");
ALTER TABLE ONLY "buscontrol"."student_trip_status"
    ADD CONSTRAINT "student_trip_status_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."social_bus_escolar"("id");

CREATE POLICY "guardian_read_linked_padron" ON "public"."social_bus_escolar" FOR SELECT TO "authenticated" USING ("buscontrol"."is_guardian_of_student"("id"));
CREATE POLICY "ops_read_padron" ON "public"."social_bus_escolar" FOR SELECT TO "authenticated" USING (("buscontrol"."current_app_role"() = ANY (ARRAY['chofer'::"buscontrol"."app_role", 'asistenta'::"buscontrol"."app_role", 'coordinador'::"buscontrol"."app_role"])));
