-- Keep a job reserved while its selected proposal awaits payment confirmation.
alter type public.job_status add value if not exists 'awaiting_payment';
