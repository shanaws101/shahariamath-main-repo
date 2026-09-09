-- Add INSERT policy for payments table so users can create their own payments
CREATE POLICY "Users can create their own payments"
ON public.payments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add UPDATE policy so users can update their own pending payments
CREATE POLICY "Users can update their own payments"
ON public.payments
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);