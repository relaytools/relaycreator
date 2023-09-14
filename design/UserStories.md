# Relay types overview

* topical relay
  * uses keyword filters to selectively decide what topics are going to show up on the relay.
* invite only relay
  * uses pubkey filters to allow a list of pubkeys to post to the relay
* paid public relay
  * paid relay accepts a fee and then adds the pubkey to the allowed list of pubkeys (similar to invite only)
* free public relay
  * allows anyone to post

# User Stories for Relay types

## Jane's topical relay
Jane wants to create a relay that only shows posts that have to do with being a Chef.

* Jane creates the relay.
* Jane sets the General Settings "Default Message Policy: Deny"
* Jane adds the following keywords to the "Allowed Keywords" list:
  * chef, chefstr, foodstr, garlic, knives, pastries, baking, recipes, food (hashtags are not required)

## John's invite only relay
John wants to create a relay for himself and a group of friends and family to use.

* John creates the relay.
* John sets the General Settings "Default Message Policy: Deny"
* John clicks Add, under the "Allowed Pubkeys Section"
* John proceeds to add each of his friends pubkeys to the relay.
-or-
* John has already made a nostr list of his friends, and so he can bulk add the keys by clicking "Add From List: Friends and Family"

## Maria's paid public relay
Maria wants to create a relay that is open to all, but requires a payment to post.  Maria also wants the relay to show up in the relay directory.

* Maria creates the relay.
* Maria sets the General Settings "Require Lightning To Post: ON"
* (this automatically sets the default message policy: deny)
* Maria enters in the amount she wants to charge for relay access to 2100 Sats and clicks "save".
* Maria had a few friends pay out of band, and wants to add them to the relay as well, so she clicks "Add Pubkey" under the "Allowed Pubkeys" settings and adds some additional pubkeys.
* Maria sets the General Settings for "Relay Is Listed in the Public Directory: true"
* Maria announces to nostr that her relay is open and accepting payments by handing out the url https://marias-relay.nostr1.com
* Users navigate to this page, enter their pubkey, and click "Pay with Lightning.  After paying the invoice, the users are granted access to post to the relay.

## Fred's public relay
Fred wants to run a free public relay, in which all users are able to post for free.  However he does not want to filter out #nsfw posts.  Fred also wants the relay to show up in the relay directory.

* Fred creates the relay
* Fred clicks "Edit Details".
* Fred edits the description of the relay to say "Fred's public relay"
* Fred uploads a banner image to nostr.build and enters the URL for the image as the Banner Image URL and clicks Save.
* Fred sets the General Settings for "Relay Is Listed in the Public Directory: true"
* Fred adds a "Blocked Keyword" list for the following keywords:
  * #nsfw ...

# User Stories for Moderators
All types of relays have moderation built in.  The list of moderators allows users to login to relay.tools, they can see a list of relays that they moderate, and any relay that they manage will respond to any reports sent to the relay about content that is not wanted by deleting it.

## Jen's topical relay with moderators
Jen wants to create a topical relay for artwork and photography.  Jen also wants to have a team of moderators that can delete posts that are off-topic.

* Jen follows the guide for creating a topical relay.
* Jen adds the pubkeys of her moderation team to the moderator list.
* Each moderator adds the relay to their relay list.
* A moderator notices someone has mistakenly added a message that is unrelated to Art and yet has passed the keyword filter.  They navigate to the relay explorer on relay.tools and click, "Delete Post".  This sends a 1984 report to the relay for this specific message.  The relay responds by deleting the post.
* A moderator notices someone is spamming the Art category with art in an unfriendly way.  They decide to delete all posts from this spammer pubkey.  They navigate to the relay explorer on relay.tools and click, "Delete All from Pubkey".  This does two things, it adds the Pubkey to the list of "Blocked Pubkeys, and sends a 1984 report to the relay for this pubkey.  The relay responds by deleting all posts from this pubkey.  Future posts from this pubkey will be blocked.
* A moderator notices that an off-topic message has arrived on the relay, but they are not able to login to relay.tools.  They send a 1984 report to the relay for the post from a different client.  The relay responds by deleting the post.