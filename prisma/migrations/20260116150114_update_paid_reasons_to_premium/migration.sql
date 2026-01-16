-- Update all ListEntryPubkey records with reason 'paid' to 'paid premium'
-- according to issue #25
UPDATE ListEntryPubkey SET reason = 'paid premium' WHERE reason = 'paid';
