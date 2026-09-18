alter table public.events alter column currency set default 'PKR';
update public.events set currency = 'PKR' where currency is null or currency = 'USD';
