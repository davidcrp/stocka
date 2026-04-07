
DROP POLICY "Users can delete own vehicles or managers" ON public.vehicles;

CREATE POLICY "Users can delete vehicles in own account"
ON public.vehicles
FOR DELETE
TO authenticated
USING (
  (account_id = get_user_account_id()) AND is_user_approved()
);
