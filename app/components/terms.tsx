"use client"
import { useState } from "react"
export default function Terms(
    props: React.PropsWithChildren<{
    }>) {

    const [showTerms, setShowTerms] = useState(false)

    return (
        <div>
            By connecting to this relay, you agree to these <button className="btn uppercase btn-neutral" onClick={() => setShowTerms(!showTerms)}>Terms of Service  <img className="w-5 h-5" src="icons8-tooltip-64.png"></img></button>
            {showTerms &&
                <div>
                    <p className="text-lg">This Terms of Sevice applies to all relays hosted by relay.tools.</p>

                    <p>This service (and supporting services) are provided "as is", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose and noninfringement.</p>

                    <p className="text-lg">By connecting to this relay, you agree to the following:</p>

                    <ul className="text-sm list-disc list-inside">
                        <li>To not misuse or abuse the relay service and other supporting services</li>
                        <li>To not disseminate illegal content or material</li>
                        <li>That this relay has no control over any content published in other relays</li>
                        <li>That some services, such as but not limited to the privilege to publish content may require payment(s)</li>
                        <li>That the service might be revoked to you at the operator's sole discretion if found in violation of these terms</li>
                        <li>That the terms of service may change at any time in the future without explicit notice</li>
                        <li>To grant us the necessary rights to your content to provide the service to you and to other users for an unlimited time</li>
                        <li>To use the service in compliance with all laws, rules, and regulations applicable to you and the legal jurisdiction in which this relay is operating.</li>
                        <li>To use the service in good faith and not seek to get the relay operator(s) in trouble</li>
                        <li>That the service may throttle, rate limit or revoke your access to any content and/or your privilege to publish content for any reason</li>
                        <li>That the content you publish to this relay will be further broadcasted to any interested client and/or accepting relay</li>
                        <li>That this service is not targeted, nor intended for use by, anyone under the legal age in their respective jurisdiction</li>
                        <li>To be of legal age or have sufficient legal constent, permission and capacity to use this service</li>
                        <li>That the service may be temporarily shutdown or permanently terminated at any time and without notice</li>
                        <li>That the content published by you and other users may be removed at any time and without notice and for any reason</li>
                    </ul>
                    <p>In addition you understand that:</p>
                    <p>
                        Nostr is a decentralized and distributed network of relays that relays data by users.
                        You may be inadvertently exposed to content that you might find triggering, disturbing, distasteful, immoral or against your views.
                        The relay operator is not liable and has no involvement in the type, quality and legality of the content being produced by users of the relay.
                    </p>
                </div>
            }
        </div>
    )
}