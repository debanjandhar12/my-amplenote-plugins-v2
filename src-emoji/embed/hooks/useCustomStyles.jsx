export const useCustomStyles = () => {
    window.React.useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
        body {
            margin: 0;
            padding: 0;
            --em-rgb-background: rgb(21, 22, 23);
        }
        
        /* Emoji Picker Page */
        em-emoji-picker {
            min-height: 100vh;
            min-width: 100vw;
            --border-radius: 0px;
        }
        
        /* Emoji Size Page */
        .emoji-size-page {
            background-color: var(--em-rgb-background);
            color: rgb(222, 222, 221);
            min-height: 100vh;
            min-width: 100vw;
        }
        
        .emoji-size-page  > h1 {
            font-size: 24px;
            font-weight: bold;
            margin: 0;
            padding: 10px;
        }
        
        .emoji-size-page-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            color: white;
        }
        
        .emoji-size-page-container > div {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .emoji-size-page-container input[type="radio"] {
            display: none;
        }
        
        .emoji-size-page-container label {
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: pointer;
        }
        
        .emoji-size-page-container label img {
            border: 1px solid transparent;
            border-radius: 10%;
            padding: 5px;
            transition: all 0.2s ease;
        }
        
        .emoji-size-page-container input[type="radio"]:checked + label img {
            border-radius: 50%; 
            background-color: rgba(255, 255, 255, .2);
        }
        
        .emoji-size-page-container button {
            padding: 10px 30px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 20px;
        }
        
        .emoji-size-page-container button:hover {
            background-color: #0056b3;
        }
        `;
        document.head.append(style);

        return () => {
            document.head.removeChild(style);
        };
    }, []);
}