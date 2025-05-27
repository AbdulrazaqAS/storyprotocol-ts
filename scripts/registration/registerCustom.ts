import { mintNFT } from '../../utils/functions/mintNFT'
import { createCommercialRemixTerms, NFTContractAddress } from '../../utils/utils'
import { client, account, networkInfo } from '../../utils/config'
import { uploadJSONToIPFS, uploadFileToIPFS } from '../../utils/functions/uploadToIpfs'
import { createHash } from 'crypto'
import { readFileSync } from 'fs';
import path from 'path';
import { IpMetadata } from '@story-protocol/core-sdk'

const createFileHash = (filePath:string): `0x${string}` => {
    // Read file as a Buffer
    const fileBuffer = readFileSync(filePath);

    // Create a SHA-256 hash of the file
    const hash = createHash('sha256').update(fileBuffer).digest('hex');

    return `0x${hash}`;
}

const main = async function () {
	// 1a. Upload IP to IPFS
    const filePath = 'assets/lensjobs-full-512x512.png';
    const fileName = filePath.split('/').at(-1);
    const fileType = 'image/png';
    const fileHash = createFileHash(filePath);
    console.log({filePath, fileName, fileType, fileHash});

    const ipImagePath = filePath;
    const ipImageName = fileName;
    const ipImageHash = createFileHash(ipImagePath);
    const ipImageType = 'image/png';
    console.log({ipImagePath, ipImageName, ipImageType, ipImageHash});

	const fileIpfsCid = await uploadFileToIPFS(filePath, fileName!, fileType);
    const imageIpfsCid = await uploadFileToIPFS(ipImagePath, ipImageName!, ipImageType);

    const fileURI = `https://ipfs.io/ipfs/${fileIpfsCid}`;
    const ipImageURI = `https://ipfs.io/ipfs/${imageIpfsCid}`;

    // 1. Set up your IP Metadata
    //
    // Docs: https://docs.story.foundation/concepts/ip-asset/ipa-metadata-standard
    const ipMetadata: IpMetadata = client.ipAsset.generateIpMetadata({
        title: 'Lens Jobs Logo',
        description: 'This is a ChatGPT generated logo for Lens Jobs app on Lens Protocol.',
        createdAt: '1748328566757',
        creators: [
            {
                name: 'AbdulrazaqAS',
                address: '0xE09b13f723f586bc2D98aa4B0F2C27A0320D20AB',
                contributionPercent: 100,
            },
        ],
        image: ipImageURI,
        imageHash: ipImageHash,
        mediaUrl: fileURI,
        mediaHash: fileHash,
        mediaType: fileType,
    })

    // 2. Set up your NFT Metadata
    //
    // Docs: https://docs.opensea.io/docs/metadata-standards#metadata-structure
    const nftMetadata = {
        name: 'Lens Jobs Logo',
        description: 'This is a ChatGPT generated logo for Lens Jobs app on Lens Protocol. This NFT represents ownership of the IP Asset.',
        image: ipImageURI,
        animation_url: fileURI,
        attributes: [
            {
                key: 'LLM',
                value: 'ChatGPT',
            },
            {
                key: 'App Url',
                value: 'https://lens-jobs.vercel.app',
            },
        ],
    }

    // 3. Upload your IP and NFT Metadata to IPFS
    const ipIpfsHash = await uploadJSONToIPFS(ipMetadata)
    const ipHash = createHash('sha256').update(JSON.stringify(ipMetadata)).digest('hex')
    const nftIpfsHash = await uploadJSONToIPFS(nftMetadata)
    const nftHash = createHash('sha256').update(JSON.stringify(nftMetadata)).digest('hex')

    // 4. Mint an NFT
    const tokenId = await mintNFT(account.address, `https://ipfs.io/ipfs/${nftIpfsHash}`)
    console.log(`NFT minted with tokenId ${tokenId}`)

    // 5. Register an IP Asset
    //
    // Docs: https://docs.story.foundation/sdk-reference/ip-asset#register
    const response = await client.ipAsset.registerIpAndAttachPilTerms({
        nftContract: NFTContractAddress,
        tokenId: tokenId!,
        licenseTermsData: [
            {
                terms: createCommercialRemixTerms({ defaultMintingFee: 1, commercialRevShare: 5 }),
            },
        ],
        ipMetadata: {
            ipMetadataURI: `https://ipfs.io/ipfs/${ipIpfsHash}`,
            ipMetadataHash: `0x${ipHash}`,
            nftMetadataURI: `https://ipfs.io/ipfs/${nftIpfsHash}`,
            nftMetadataHash: `0x${nftHash}`,
        },
        txOptions: { waitForTransaction: true },
    })
    console.log('Root IPA created:', {
        'Transaction Hash': response.txHash,
        'IPA ID': response.ipId,
    })
    console.log(`View on the explorer: ${networkInfo.protocolExplorer}/ipa/${response.ipId}`)
}

main()
